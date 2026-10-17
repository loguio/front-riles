/**
 * Community API types — mirrors `back-riles/CONTRACT-community.md`.
 * Canonical DTO source: `src/modules/community/dto/community.dto.ts`.
 */

export interface CommunityRunParticipant {
  userId: string;
  name: string;
  initials: string;
  isMe: boolean;
}

export type ChallengeMetric =
  | "distance"
  | "duration"
  | "elevation"
  | "sessions";

/** `GET /community/runs` item. `theme` may be absent or `null`. */
export interface CommunityRun {
  id: string;
  clubId: string;
  clubName: string;
  /** ISO-8601 UTC */
  scheduledAt: string;
  location: string;
  theme?: string | null;
  participantCount: number;
  isJoined: boolean;
  participants: CommunityRunParticipant[];
}

export type ToggleRunAction = "join" | "leave";

/** `POST /community/runs/:id/toggle` response. */
export interface ToggleRunParticipationResponse {
  runId: string;
  isJoined: boolean;
  participantCount: number;
}

/** `GET /community/challenges` item. */
export interface MonthlyChallenge {
  id: string;
  title: string;
  metric: ChallengeMetric;
  target: number;
  unit: string;
  progress: number;
  progressRatio: number;
  /** ISO-8601 UTC */
  periodStart: string;
  /** ISO-8601 UTC */
  periodEnd: string;
}

/**
 * Normalised error surfaced by the community service. The UI maps `kind` to a
 * translated message instead of leaking raw HTTP details.
 */
export type CommunityErrorKind =
  | "network"
  | "unauthorized"
  | "not_found"
  | "bad_request"
  | "server"
  | "unknown";

export interface CommunityError {
  kind: CommunityErrorKind;
  status: number;
  message: string;
}

/**
 * Explicit result shape: callers never have to guess whether an empty array
 * means "no data" or "the request failed".
 */
export type CommunityResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommunityError };
