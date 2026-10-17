import { ApiError } from "./apiClient";
import { communityService } from "./communityService";

jest.mock("./apiClient", () => {
  const actual = jest.requireActual("./apiClient");
  return {
    ...actual,
    apiClient: {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
  };
});

// Keep the real Supabase client (and its auto-refresh timer) out of the suite.
jest.mock("../config/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

const { apiClient } = require("./apiClient") as {
  apiClient: { get: jest.Mock; post: jest.Mock };
};

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
    { userId: "user-01", name: "Camille D.", initials: "CD", isMe: true },
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
  jest.clearAllMocks();
});

describe("communityService.getCommunityRuns", () => {
  it("GETs community/runs and returns the payload on success", async () => {
    apiClient.get.mockResolvedValueOnce([run]);

    const result = await communityService.getCommunityRuns();

    expect(apiClient.get).toHaveBeenCalledWith("community/runs", {
      params: undefined,
    });
    expect(result).toEqual({ ok: true, data: [run] });
  });

  it("forwards the optional clubId filter as a query param", async () => {
    apiClient.get.mockResolvedValueOnce([]);

    const result = await communityService.getCommunityRuns({ clubId: "club-01" });

    expect(apiClient.get).toHaveBeenCalledWith("community/runs", {
      params: { clubId: "club-01" },
    });
    expect(result).toEqual({ ok: true, data: [] });
  });

  it("normalises a network failure to kind network without throwing", async () => {
    apiClient.get.mockRejectedValueOnce(
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
    apiClient.get.mockRejectedValueOnce(new ApiError("Unauthorized", 401));

    const result = await communityService.getCommunityRuns();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unauthorized");
  });
});

describe("communityService.getMonthlyChallenges", () => {
  it("GETs community/challenges and returns the array on success", async () => {
    apiClient.get.mockResolvedValueOnce([challenge]);

    const result = await communityService.getMonthlyChallenges();

    expect(apiClient.get).toHaveBeenCalledWith("community/challenges");
    expect(result).toEqual({ ok: true, data: [challenge] });
  });

  it("coerces a non-array payload to an empty list", async () => {
    apiClient.get.mockResolvedValueOnce(null);

    const result = await communityService.getMonthlyChallenges();

    expect(result).toEqual({ ok: true, data: [] });
  });

  it("maps a 500 to kind server", async () => {
    apiClient.get.mockRejectedValueOnce(new ApiError("Boom", 500));

    const result = await communityService.getMonthlyChallenges();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("server");
  });
});

describe("communityService.toggleRunRegistration", () => {
  it("POSTs to the toggle endpoint without a body when action is omitted", async () => {
    apiClient.post.mockResolvedValueOnce({
      runId: "run-01",
      isJoined: true,
      participantCount: 13,
    });

    const result = await communityService.toggleRunRegistration("run-01");

    expect(apiClient.post).toHaveBeenCalledWith(
      "community/runs/run-01/toggle",
      undefined,
    );
    expect(result).toEqual({
      ok: true,
      data: { runId: "run-01", isJoined: true, participantCount: 13 },
    });
  });

  it("sends the explicit action when provided", async () => {
    apiClient.post.mockResolvedValueOnce({
      runId: "run-01",
      isJoined: false,
      participantCount: 11,
    });

    await communityService.toggleRunRegistration("run-01", "leave");

    expect(apiClient.post).toHaveBeenCalledWith(
      "community/runs/run-01/toggle",
      { action: "leave" },
    );
  });

  it("maps a 404 to kind not_found", async () => {
    apiClient.post.mockRejectedValueOnce(new ApiError("Run not found", 404));

    const result = await communityService.toggleRunRegistration("missing");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("not_found");
      expect(result.error.status).toBe(404);
    }
  });

  it("maps a 400 to kind bad_request", async () => {
    apiClient.post.mockRejectedValueOnce(new ApiError("Bad action", 400));

    const result = await communityService.toggleRunRegistration("run-01");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("bad_request");
  });

  it("maps an unknown thrown value to kind unknown", async () => {
    apiClient.post.mockRejectedValueOnce(new Error("weird"));

    const result = await communityService.toggleRunRegistration("run-01");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("unknown");
      expect(result.error.message).toBe("weird");
    }
  });
});
