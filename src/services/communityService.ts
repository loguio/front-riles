import {
  CommunityResult,
  CommunityError,
  CommunityRun,
  MonthlyChallenge,
  ToggleRunAction,
  ToggleRunParticipationResponse,
} from "../types";
import { apiClient, ApiError } from "./apiClient";

/**
 * Community service — real HTTP calls against the NestJS backend.
 *
 * All methods return a {@link CommunityResult} discriminated union so a failed
 * request is never mistaken for an empty list. No mock/in-memory data path
 * remains here on purpose: build against `CONTRACT-community.md`.
 */

/** Maps any thrown error to the normalised community error shape. */
function normalizeError(error: unknown): CommunityError {
  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      return { kind: "network", status: error.status, message: error.message };
    }
    switch (error.status) {
      case 400:
        return { kind: "bad_request", status: 400, message: error.message };
      case 401:
        return { kind: "unauthorized", status: 401, message: error.message };
      case 404:
        return { kind: "not_found", status: 404, message: error.message };
      default:
        return { kind: "server", status: error.status, message: error.message };
    }
  }

  return {
    kind: "unknown",
    status: 0,
    message:
      error instanceof Error ? error.message : "Erreur communautaire inconnue",
  };
}

export const communityService = {
  /**
   * `GET /community/runs` — optional `clubId` filter. Returns `[]` on an empty
   * server list; errors are surfaced through the result wrapper.
   */
  async getCommunityRuns(params?: {
    clubId?: string;
  }): Promise<CommunityResult<CommunityRun[]>> {
    try {
      const data = await apiClient.get<CommunityRun[]>("community/runs", {
        params: params?.clubId ? { clubId: params.clubId } : undefined,
      });
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      return { ok: false, error: normalizeError(error) };
    }
  },

  /**
   * `GET /community/challenges` — monthly challenges for the current user.
   */
  async getMonthlyChallenges(): Promise<CommunityResult<MonthlyChallenge[]>> {
    try {
      const data = await apiClient.get<MonthlyChallenge[]>(
        "community/challenges",
      );
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      return { ok: false, error: normalizeError(error) };
    }
  },

  /**
   * `POST /community/runs/:id/toggle` — join, leave, or flip participation.
   * Omit `action` to toggle the current state server-side.
   */
  async toggleRunRegistration(
    runId: string,
    action?: ToggleRunAction,
  ): Promise<CommunityResult<ToggleRunParticipationResponse>> {
    try {
      const data = await apiClient.post<ToggleRunParticipationResponse>(
        `community/runs/${runId}/toggle`,
        action ? { action } : undefined,
      );
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: normalizeError(error) };
    }
  },
};
