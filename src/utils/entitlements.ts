import { Entitlement, EntitlementState } from "../types/billing";

/**
 * Frontend mirror of the backend `isPro()` rule (Phase 5B, F4).
 *
 * Kept deliberately tiny and pure so both the paywall and the gating hook share
 * one source of truth, and so it can be unit-tested without a clock or network.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Classifies an entitlement into the three UI states. `now` is injectable so the
 * trial-expiry boundary can be tested deterministically.
 */
export function getEntitlementState(
  entitlement: Entitlement | null | undefined,
  now: Date = new Date(),
): EntitlementState {
  if (!entitlement) {
    return "basic";
  }
  if (entitlement.planType === "pro") {
    return "pro";
  }
  if (entitlement.trialEndsAt) {
    const endsAt = new Date(entitlement.trialEndsAt).getTime();
    if (!Number.isNaN(endsAt) && endsAt > now.getTime()) {
      return "trial";
    }
  }
  // The backend is authoritative: `isPro` without a subscription or a live
  // trial still counts as Pro.
  if (entitlement.isPro) {
    return "pro";
  }
  return "basic";
}

/**
 * Whole days left in the free trial, rounded up so "18h remaining" reads as
 * "1 day left". Returns `0` when there is no trial, it is malformed, or it has
 * already expired.
 */
export function trialDaysRemaining(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): number {
  if (!trialEndsAt) {
    return 0;
  }
  const endsAt = new Date(trialEndsAt).getTime();
  if (Number.isNaN(endsAt)) {
    return 0;
  }
  const diff = endsAt - now.getTime();
  if (diff <= 0) {
    return 0;
  }
  return Math.ceil(diff / MS_PER_DAY);
}

/** Convenience: is the entitlement currently Pro (subscription or live trial)? */
export function isEntitled(
  entitlement: Entitlement | null | undefined,
  now: Date = new Date(),
): boolean {
  return getEntitlementState(entitlement, now) !== "basic";
}
