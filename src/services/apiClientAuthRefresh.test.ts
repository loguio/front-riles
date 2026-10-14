import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * RILES-042 — régressions sur le cycle de vie du token :
 *  - un 401 déclenche un refresh puis UN seul replay qui réussit ;
 *  - si le refresh échoue, la session locale est purgée (reconnexion forcée)
 *    et surtout AUCUNE boucle : la requête suivante échoue avant le réseau ;
 *  - un deuxième 401 malgré le jeton frais est une défaillance dure ;
 *  - les GET résistent aux erreurs réseau avec un backoff exponentiel.
 *
 * Supabase et fetch sont mockés : aucun appel réseau, aucune config requise.
 */
const supabaseAuth = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("../config/supabase", () => ({ supabase: { auth: supabaseAuth } }));

import {
  getAuthToken,
  getUserId,
  setAuthToken,
  setUserId,
} from "../config/api";
import { apiClient } from "./apiClient";

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 401 ? "Unauthorized" : "OK",
  headers: {
    get: (name: string) =>
      name.toLowerCase() === "content-type" ? "application/json" : null,
  },
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const expiredSession = {
  data: {
    session: { access_token: "tok-expired", user: { id: "uuid-real-42" } },
  },
};

describe("RILES-042: 401 → refresh → single replay", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    setAuthToken(null);
    setUserId(null);
    supabaseAuth.getSession.mockReset();
    supabaseAuth.refreshSession.mockReset();
    supabaseAuth.signOut.mockReset();
    supabaseAuth.signOut.mockResolvedValue({ error: null });
    fetchSpy.mockReset();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("refreshes the token and replays the request exactly once (success)", async () => {
    setAuthToken("tok-expired");
    setUserId("uuid-real-42");
    // La session locale porte encore l'ancien jeton → refresh explicite.
    supabaseAuth.getSession.mockResolvedValue(expiredSession);
    supabaseAuth.refreshSession.mockResolvedValue({
      data: {
        session: { access_token: "tok-fresh", user: { id: "uuid-real-42" } },
      },
      error: null,
    });
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ message: "Token expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await apiClient.get<{ ok: boolean }>("coach/history");

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(supabaseAuth.refreshSession).toHaveBeenCalledTimes(1);

    const [, firstInit] = fetchSpy.mock.calls[0];
    const [, secondInit] = fetchSpy.mock.calls[1];
    expect(firstInit.headers["Authorization"]).toBe("Bearer tok-expired");
    expect(secondInit.headers["Authorization"]).toBe("Bearer tok-fresh");
    expect(secondInit.headers["x-user-id"]).toBe("uuid-real-42");

    expect(getAuthToken()).toBe("tok-fresh");
    expect(getUserId()).toBe("uuid-real-42");
    expect(supabaseAuth.signOut).not.toHaveBeenCalled();
  });

  it("gives up after the single replay and forces a logged-out state", async () => {
    setAuthToken("tok-expired");
    setUserId("uuid-real-42");
    supabaseAuth.getSession.mockResolvedValue(expiredSession);
    supabaseAuth.refreshSession.mockResolvedValue({
      data: {
        session: { access_token: "tok-fresh", user: { id: "uuid-real-42" } },
      },
      error: null,
    });
    fetchSpy.mockResolvedValue(jsonResponse({ message: "Nope" }, 401));

    const error = await apiClient
      .post("coach/actions", { action: "adapt" })
      .catch((err) => err);

    expect(error).toMatchObject({ name: "ApiError", status: 401 });
    // Une seule reprise après refresh : jamais d'enchaînement.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(supabaseAuth.refreshSession).toHaveBeenCalledTimes(1);
    expect(supabaseAuth.signOut).toHaveBeenCalledTimes(1);
    expect(getAuthToken()).toBeNull();
    expect(getUserId()).toBeNull();
  });

  it("logs the user out without replaying when the refresh fails, and never loops", async () => {
    setAuthToken("tok-dead");
    setUserId("uuid-real-42");
    // Session locale encore portée par le jeton refusé (tok-dead) : le cache
    // n'a donc rien de plus frais à proposer → refresh explicite obligatoire.
    const deadSession = {
      data: {
        session: { access_token: "tok-dead", user: { id: "uuid-real-42" } },
      },
    };
    // 1er appel getSession : pendant le handling du 401 (jeton identique).
    supabaseAuth.getSession.mockResolvedValueOnce(deadSession);
    // Appels suivants : plus de session, comme après une déconnexion.
    supabaseAuth.getSession.mockResolvedValue({ data: { session: null } });
    supabaseAuth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid Refresh Token" },
    });
    fetchSpy.mockResolvedValue(jsonResponse({ message: "Expired" }, 401));

    const error = await apiClient.get("coach/history").catch((err) => err);
    expect(error).toMatchObject({ name: "ApiError", status: 401 });
    // Refresh en échec → pas de replay du tout.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(supabaseAuth.refreshSession).toHaveBeenCalledTimes(1);
    expect(supabaseAuth.signOut).toHaveBeenCalledTimes(1);
    expect(getAuthToken()).toBeNull();
    expect(getUserId()).toBeNull();

    // État déconnecté : la requête suivante échoue avant le réseau,
    // donc aucun enchaînement refresh/replay infini.
    const secondError = await apiClient.get("coach/history").catch((e) => e);
    expect(secondError).toMatchObject({ name: "ApiError", status: 401 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(supabaseAuth.signOut).toHaveBeenCalledTimes(1);
  });

  it("backs off exponentially on GET network errors and never retries POST", async () => {
    setAuthToken("tok-ok");
    setUserId("uuid-real-42");
    fetchSpy
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const startedAt = Date.now();
    const result = await apiClient.get<{ ok: boolean }>("coach/history");
    const elapsedMs = Date.now() - startedAt;

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    //200ms puis 400ms : le délai total prouve un backoff, pas une boucle sèche.
    expect(elapsedMs).toBeGreaterThanOrEqual(590);

    fetchSpy.mockClear();
    fetchSpy.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(apiClient.post("coach/actions", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
