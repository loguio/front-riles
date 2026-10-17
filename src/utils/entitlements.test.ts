import { describe, expect, it } from "vitest";
import { Entitlement } from "../types/billing";
import { getEntitlementState, trialDaysRemaining } from "./entitlements";

const NOW = new Date("2026-10-17T12:00:00.000Z");
const daysFromNow = (days: number) =>
  new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

const pro: Entitlement = { planType: "pro", isPro: true, trialEndsAt: null };
const trial: Entitlement = {
  planType: "basic",
  isPro: true,
  trialEndsAt: daysFromNow(9),
};
const expired: Entitlement = {
  planType: "basic",
  isPro: false,
  trialEndsAt: daysFromNow(-2),
};
const basic: Entitlement = {
  planType: "basic",
  isPro: false,
  trialEndsAt: null,
};

describe("getEntitlementState", () => {
  it("returns pro for an active subscription", () => {
    expect(getEntitlementState(pro, NOW)).toBe("pro");
  });

  it("mirrors the backend: a stale isPro flag on a basic plan stays basic", () => {
    expect(
      getEntitlementState(
        { planType: "basic", isPro: true, trialEndsAt: null },
        NOW,
      ),
    ).toBe("basic");
  });

  it("returns trial while the trial end is in the future", () => {
    expect(getEntitlementState(trial, NOW)).toBe("trial");
  });

  it("returns basic once the trial has expired", () => {
    expect(getEntitlementState(expired, NOW)).toBe("basic");
  });

  it("returns basic with no subscription and no trial", () => {
    expect(getEntitlementState(basic, NOW)).toBe("basic");
  });

  it("returns basic for a null/undefined entitlement", () => {
    expect(getEntitlementState(null, NOW)).toBe("basic");
    expect(getEntitlementState(undefined, NOW)).toBe("basic");
  });
});

describe("trialDaysRemaining", () => {
  it("counts whole days left in the trial", () => {
    expect(trialDaysRemaining(daysFromNow(9), NOW)).toBe(9);
  });

  it("rounds up a partial day so 18h reads as 1 day", () => {
    const in18h = new Date(NOW.getTime() + 18 * 60 * 60 * 1000).toISOString();
    expect(trialDaysRemaining(in18h, NOW)).toBe(1);
  });

  it("returns 0 for an expired trial", () => {
    expect(trialDaysRemaining(daysFromNow(-1), NOW)).toBe(0);
  });

  it("returns 0 when there is no trial", () => {
    expect(trialDaysRemaining(null, NOW)).toBe(0);
    expect(trialDaysRemaining(undefined, NOW)).toBe(0);
  });

  it("returns 0 for a malformed date", () => {
    expect(trialDaysRemaining("not-a-date", NOW)).toBe(0);
  });
});
