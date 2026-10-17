import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * communityService �?" real-API service (Phase 5B F1). The HTTP client is fully
 * mocked: no network. A failed request must come back as a typed
 * {@link CommunityResult} error instead of throwing or falling back to data.
 */
const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./apiClient", () => {
  class ApiError extends Error {
    status: number;
    data: any;
    isNetworkError: boolean;
    constructor(
      message: string,
      status = 0,
      data: any = null,
      isNetworkError = false,
    ) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
      this.isNetworkError = isNetworkError;
    }
  }
  return { apiClient: apiClientMock, ApiError };
});

import { ApiError } from "./apiClient";
import { communityService } from "./communityService";

const run = {
  id: "run-01",
  clubId: "club-01",
  clubName: "Riles Paris",
  scheduledAt: "2026-10-20T18:30:00.000Z",
  location: "Parc des Buttes-Chaumont, Paris",
  theme: "Sortie seuil en groupe",
  participantCount: 12,
  isJoined: true,
  participants: [
    { userId: "member-01", name: "Camille D.", initials: "CD", isMe: true },
  ],
};

const challenge = {
  id: "challenge-01",
  title: "100 km en octobre",
  metric: "distance" as const,
  target: 100,
  unit: "km",
  progress: 42.5,
  progressRatio: 0.425,
  periodStart: "2026-10-01T00:00:00.000Z",
  periodEnd: "2026-10-31T23:59:59.999Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("communityService.getCommunityRuns", () => {
  it("GETs community/runs and returns the payload on success", async () => {
    apiClientMock.get.mockResolvedValueOnce([run]);

    const result = await communityService.getCommunityRuns();

    expect(apiClientMock.get).toHaveBeenCalledWith("community/runs", {
      params: undefined,
    });
    expect(result).toEqual({ ok: true, data: [run] });
  });

  it("forwards the optional clubId filter as a query param", async () => {
    apiClientMock.get.mockResolvedValueOnce([]);

    const result = await communityService.getCommunityRuns({
      clubId: "club-01",
    });

    expect(apiClientMock.get).toHaveBeenCalledWith("community/runs", {
      params: { clubId: "club-01" },
    });
    expect(result).toEqual({ ok: true, data: [] });
  });

  it("normalises a network failure to kind network without throwing", async () => {
    apiClientMock.get.mockRejectedValueOnce(
      new ApiError("Connexion impossible", 0, null, true),
    );

    const result = await communityService.getCommunityRuns();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: "network",
        status: 0,
        message: "Connexion impossible",
      });
    }
  });

  it("maps a 401 to kind unauthorized", async () => {
    apiClientMock.get.mockRejectedValueOnce(new ApiError("Unauthorized", 401));

    const result = await communityService.getCommunityRuns();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unauthorized");
  });
});

describe("communityService.getMonthlyChallenges", () => {
  it("GETs community/challenges and returns the array on success", async () => {
    apiClientMock.get.mockResolvedValueOnce([challenge]);

    const result = await communityService.getMonthlyChallenges();

    expect(apiClientMock.get).toHaveBeenCalledWith("community/challenges");
    expect(result).toEqual({ ok: true, data: [challenge] });
  });

  it("coerces a non-array payload to an empty list", async () => {
    apiClientMock.get.mockResolvedValueOnce(null);

    const result = await communityService.getMonthlyChallenges();

    expect(result).toEqual({ ok: true, data: [] });
  });

  it("maps a 500 to kind server", async () => {
    apiClientMock.get.mockRejectedValueOnce(new ApiError("Boom", 500));

    const result = await communityService.getMonthlyChallenges();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("server");
  });
});

describe("communityService.toggleRunRegistration", () => {
  it("POSTs to the toggle endpoint without a body when action is omitted", async () => {
    apiClientMock.post.mockResolvedValueOnce({
      runId: "run-01",
      isJoined: true,
      participantCount: 13,
    });

    const result = await communityService.toggleRunRegistration("run-01");

    expect(apiClientMock.post).toHaveBeenCalledWith(
      "community/runs/run-01/toggle",
      undefined,
    );
    expect(result).toEqual({
      ok: true,
      data: { runId: "run-01", isJoined: true, participantCount: 13 },
    });
  });

  it("sends the explicit action when provided", async () => {
    apiClientMock.post.mockResolvedValueOnce({
      runId: "run-01",
      isJoined: false,
      participantCount: 11,
    });

    await communityService.toggleRunRegistration("run-01", "leave");

    expect(apiClientMock.post).toHaveBeenCalledWith(
      "community/runs/run-01/toggle",
      { action: "leave" },
    );
  });

  it("maps a 404 to kind not_found", async () => {
    apiClientMock.post.mockRejectedValueOnce(
      new ApiError("Run not found", 404),
    );

    const result = await communityService.toggleRunRegistration("missing");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("not_found");
      expect(result.error.status).toBe(404);
    }
  });

  it("maps a 400 to kind bad_request", async () => {
    apiClientMock.post.mockRejectedValueOnce(new ApiError("Bad action", 400));

    const result = await communityService.toggleRunRegistration("run-01");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("bad_request");
  });

  it("maps an unknown thrown value to kind unknown", async () => {
    apiClientMock.post.mockRejectedValueOnce(new Error("weird"));

    const result = await communityService.toggleRunRegistration("run-01");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("unknown");
      expect(result.error.message).toBe("weird");
    }
  });
});
