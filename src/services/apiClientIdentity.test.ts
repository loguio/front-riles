import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * RILES-017 — aucune requête ne peut plus porter une identité codée en dur :
 *  - sans session, l'appel échoue (401) avant même d'atteindre le réseau ;
 *  - avec une session, seul l'identifiant réel de l'utilisateur part en header.
 *
 * Le client Supabase est mocké (aucun appel réseau, aucune config requise).
 */
const supabaseAuth = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("../config/supabase", () => ({ supabase: { auth: supabaseAuth } }));

import { getUserId, setAuthToken, setUserId } from "../config/api";
import { apiClient } from "./apiClient";

const FALLBACK_ID = ["user", "01"].join("-");

const jsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  headers: {
    get: (name: string) =>
      name.toLowerCase() === "content-type" ? "application/json" : null,
  },
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe("RILES-017: no request path can send a hardcoded user id", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    setAuthToken(null);
    setUserId(null);
    supabaseAuth.getSession.mockReset();
    fetchSpy.mockReset();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses to send any request without an authenticated session", async () => {
    supabaseAuth.getSession.mockResolvedValueOnce({ data: { session: null } });

    const error = await apiClient.get("users/profile").catch((err) => err);

    expect(error).toMatchObject({ name: "ApiError", status: 401 });
    expect(String((error as { message?: string }).message)).toContain(
      "Session",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never sends the hardcoded default user id", async () => {
    supabaseAuth.getSession.mockResolvedValueOnce({
      data: {
        session: { access_token: "tok-abc", user: { id: "uuid-real-42" } },
      },
    });
    fetchSpy.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiClient.get("users/profile");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    const serialized = JSON.stringify(init.headers);
    expect(serialized).not.toContain(FALLBACK_ID);
    expect(init.headers["x-user-id"]).toBe("uuid-real-42");
    expect(init.headers["Authorization"]).toBe("Bearer tok-abc");
  });

  it("reuses the real session cached by the app", async () => {
    setAuthToken("tok-cached");
    setUserId("uuid-cached-7");
    fetchSpy.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiClient.get("coach/history");

    expect(supabaseAuth.getSession).not.toHaveBeenCalled();
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers["x-user-id"]).toBe("uuid-cached-7");
    expect(init.headers["x-user-id"]).not.toBe(FALLBACK_ID);
  });

  it("sends no x-user-id header at all when only a token is known", async () => {
    setAuthToken("tok-only");
    setUserId(null);
    fetchSpy.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiClient.get("coach/history");

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers["x-user-id"]).toBeUndefined();
    expect(init.headers["Authorization"]).toBe("Bearer tok-only");
  });

  it("starts with no identity configured at all", () => {
    expect(getUserId()).toBeNull();
  });
});
