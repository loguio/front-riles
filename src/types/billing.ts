/**
 * Billing / entitlement types (Phase 5B, F4).
 *
 * These mirror the backend contract in `back-riles`:
 * - `PlanType { BASIC, PRO }` (Prisma enum, serialised lower-case here),
 * - `User.trialEndsAt` (nullable ISO date),
 * - the `isPro()` helper: Pro when `planType === "pro"` OR the trial is still
 *   running.
 *
 * The frontend never computes entitlement on its own beyond this mirror: the
 * value comes from a {@link BillingClient}. See `src/services/billingClient.ts`.
 */

/** Subscription plan, mirroring the backend `PlanType` enum. */
export type PlanType = "basic" | "pro";

/** Entitlement snapshot for the current user. */
export interface Entitlement {
  planType: PlanType;
  /** Backend-computed: `planType === "pro"` OR an unexpired trial. */
  isPro: boolean;
  /** ISO timestamp of the trial end, or `null` when there is no trial. */
  trialEndsAt: string | null;
}

/**
 * UI-facing entitlement state derived from an {@link Entitlement}.
 * - `pro`: paid subscription active.
 * - `trial`: no subscription yet, but the free trial is still running.
 * - `basic`: free plan, no active trial (or expired).
 */
export type EntitlementState = "pro" | "trial" | "basic";
