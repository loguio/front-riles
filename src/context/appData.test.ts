import { describe, expect, it, vi } from "vitest";
import {
  loadAppData,
  toUserFacingError,
  type AppDataDependencies,
} from "./appData";

/**
 * RILES-015 — le chargement initial propage les échecs : l'application passe
 * en état d'erreur (bandeau + Réessayer) au lieu d'afficher des données mock.
 */
const makeDeps = (): AppDataDependencies => ({
  getOnboardingState: vi.fn(async () => ({ isCompleted: true }) as any),
  getProfile: vi.fn(async () => ({ id: "real-user", name: "Athlète" }) as any),
  getWeekWorkouts: vi.fn(async () => [] as any[]),
  getMonthWorkouts: vi.fn(async () => ({}) as any),
  getChatHistory: vi.fn(async () => [] as any[]),
  getQuickPrompts: vi.fn(async () => [] as any[]),
  getCommunityRuns: vi.fn(async () => [] as any[]),
  getMonthlyChallenge: vi.fn(async () => ({ id: "c1" }) as any),
});

const params = { week: 42, year: 2026, month: 9 };

describe("loadAppData", () => {
  it("rejects the whole load when one service fails (error state, no mock data)", async () => {
    const deps = makeDeps();
    (deps.getProfile as any).mockRejectedValueOnce(new Error("backend down"));

    await expect(loadAppData(deps, params)).rejects.toThrow("backend down");
  });

  it("does not resolve partial data when a service fails", async () => {
    const deps = makeDeps();
    (deps.getWeekWorkouts as any).mockRejectedValueOnce(new Error("timeout"));

    const result = await loadAppData(deps, params).catch(() => null);
    expect(result).toBeNull();
  });

  it("resolves real data when every service succeeds", async () => {
    const deps = makeDeps();

    const data = await loadAppData(deps, params);

    expect(data.user.id).toBe("real-user");
    expect(data.isOnboardingCompleted).toBe(true);
    expect(deps.getWeekWorkouts).toHaveBeenCalledWith(42, 2026);
    expect(deps.getMonthWorkouts).toHaveBeenCalledWith(9, 2026);
  });
});

describe("toUserFacingError", () => {
  it("exposes the real error message for a failed service call", () => {
    expect(toUserFacingError(new Error("HTTP 503"))).toBe("HTTP 503");
  });

  it("falls back to a generic connection message when there is no message", () => {
    expect(toUserFacingError(undefined)).toMatch(/connexion/i);
    expect(toUserFacingError("")).toMatch(/connexion/i);
  });
});
