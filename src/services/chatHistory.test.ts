import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * RILES-016 — un historique vide reste vide : le chat affiche l'état vide
 * (avec les suggestions du backend), jamais une conversation fabriquée.
 * Un échec d'appel, lui, rejette — il n'est pas transformé en « vide ».
 *
 * Client API mocké : aucun appel réseau.
 */
const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("./apiClient", () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status = 0) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }
  return { apiClient: apiClientMock, ApiError };
});

import { loadAppData } from "../context/appData";
import { chatService } from "./chatService";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("chatService.getChatHistory", () => {
  it("returns an empty history when the backend reports no messages", async () => {
    apiClientMock.get.mockResolvedValueOnce([]);

    const history = await chatService.getChatHistory();

    expect(history).toEqual([]);
    expect(history).toHaveLength(0);
  });

  it("never injects a pre-scripted conversation", async () => {
    apiClientMock.get.mockResolvedValueOnce([]);

    const history = await chatService.getChatHistory();

    // Aucun message de coach synthétisé localement.
    expect(history.some((m) => m.sender === "coach")).toBe(false);
    expect(history).toEqual([]);
  });

  it("rejects when the history cannot be fetched (failure != empty)", async () => {
    apiClientMock.get.mockRejectedValueOnce(new Error("backend down"));

    await expect(chatService.getChatHistory()).rejects.toThrow("backend down");
  });

  it("returns the real history untouched when the backend has one", async () => {
    const realHistory = [
      { id: "srv-1", sender: "coach", text: "Bonjour", timestamp: "09:00" },
    ];
    apiClientMock.get.mockResolvedValueOnce(realHistory);

    await expect(chatService.getChatHistory()).resolves.toEqual(realHistory);
  });

  it("returns an empty prompt list when the backend has no suggestion", async () => {
    apiClientMock.get.mockResolvedValueOnce([]);

    await expect(chatService.getQuickPrompts()).resolves.toEqual([]);
  });
});

describe("loadAppData (RILES-016)", () => {
  const makeDeps = () => ({
    getOnboardingState: vi.fn(async () => ({ isCompleted: true }) as any),
    getProfile: vi.fn(async () => ({ id: "real-user" }) as any),
    getWeekWorkouts: vi.fn(async () => [] as any[]),
    getMonthWorkouts: vi.fn(async () => ({}) as any),
    getChatHistory: vi.fn(async () => [] as any[]),
    getQuickPrompts: vi.fn(async () => [] as any[]),
    getCommunityRuns: vi.fn(async () => [] as any[]),
    getMonthlyChallenge: vi.fn(async () => ({ id: "c1" }) as any),
  });

  it("keeps an empty chat history empty in the loaded app state", async () => {
    const deps = makeDeps();

    const data = await loadAppData(deps, { week: 42, year: 2026, month: 9 });

    expect(data.chatMessages).toEqual([]);
    expect(data.chatMessages).toHaveLength(0);
  });

  it("propagates a failed history call instead of loading an empty chat", async () => {
    const deps = makeDeps();
    deps.getChatHistory.mockRejectedValueOnce(new Error("history down"));

    await expect(
      loadAppData(deps, { week: 42, year: 2026, month: 9 }),
    ).rejects.toThrow("history down");
  });
});
