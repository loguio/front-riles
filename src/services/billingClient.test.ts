import { describe, expect, it } from "vitest";
import { FakeBillingClient } from "./billingClient";

describe("FakeBillingClient", () => {
  it("defaults to Pro so the stubbed beta never blocks users", async () => {
    const client = new FakeBillingClient();

    await expect(client.getEntitlement()).resolves.toEqual({
      planType: "pro",
      isPro: true,
      trialEndsAt: null,
    });
  });

  it("can be constructed as a non-Pro (gated) user", async () => {
    const client = new FakeBillingClient({ planType: "basic", isPro: false });

    await expect(client.getEntitlement()).resolves.toEqual({
      planType: "basic",
      isPro: false,
      trialEndsAt: null,
    });
  });

  it("exposes a live trial as Pro with the trial end date", async () => {
    const trialEndsAt = "2026-11-01T00:00:00.000Z";
    const client = new FakeBillingClient({
      planType: "basic",
      isPro: true,
      trialEndsAt,
    });

    await expect(client.getEntitlement()).resolves.toEqual({
      planType: "basic",
      isPro: true,
      trialEndsAt,
    });
  });

  it("purchasePro flips the entitlement to Pro and keeps the trial date", async () => {
    const client = new FakeBillingClient({
      planType: "basic",
      isPro: false,
      trialEndsAt: "2026-11-01T00:00:00.000Z",
    });

    const purchased = await client.purchasePro();

    expect(purchased).toEqual({
      planType: "pro",
      isPro: true,
      trialEndsAt: "2026-11-01T00:00:00.000Z",
    });
    await expect(client.getEntitlement()).resolves.toEqual(purchased);
  });

  it("restore returns the current entitlement unchanged", async () => {
    const client = new FakeBillingClient({ planType: "basic", isPro: false });

    await expect(client.restore()).resolves.toEqual({
      planType: "basic",
      isPro: false,
      trialEndsAt: null,
    });
  });

  it("returns defensive copies so callers cannot mutate internal state", async () => {
    const client = new FakeBillingClient();
    const snapshot = await client.getEntitlement();

    snapshot.planType = "basic";
    snapshot.isPro = false;

    await expect(client.getEntitlement()).resolves.toEqual({
      planType: "pro",
      isPro: true,
      trialEndsAt: null,
    });
  });
});
