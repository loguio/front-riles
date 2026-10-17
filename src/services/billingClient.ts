import { Entitlement, PlanType } from "../types/billing";

/**
 * Billing abstraction (Phase 5B, F4).
 *
 * The app only ever talks to this interface, never to a payment SDK directly.
 * Today the only implementation is {@link FakeBillingClient} (deterministic, no
 * network, no native module) because the backend `BillingProvider` is still
 * stubbed.
 *
 * ## Swapping in RevenueCat later
 * 1. `npm install react-native-purchases` (do NOT do this while billing is
 *    stubbed).
 * 2. Add `RevenueCatBillingClient implements BillingClient` next to this file,
 *    mapping `Purchases.getCustomerInfo()` → {@link Entitlement}
 *    (`planType`, `isPro`, `trialEndsAt`) and `Purchases.purchasePackage()` /
 *    `Purchases.restorePurchases()` → `purchasePro()` / `restore()`.
 * 3. Point the `billingClient` singleton below at it, or inject it where
 *    `useProGate` / `useEntitlement` are called. Nothing else changes.
 */
export interface BillingClient {
  /** Reads the current entitlement (subscription or trial). */
  getEntitlement(): Promise<Entitlement>;
  /** Starts the Pro subscription flow and returns the resulting entitlement. */
  purchasePro(): Promise<Entitlement>;
  /** Restores previous purchases and returns the resulting entitlement. */
  restore(): Promise<Entitlement>;
}

export interface FakeBillingClientOptions {
  planType?: PlanType;
  isPro?: boolean;
  trialEndsAt?: string | null;
}

/**
 * Deterministic in-memory {@link BillingClient} used until the real RevenueCat
 * client lands. No timers, no I/O — safe under Jest and in the app.
 *
 * Defaults to the backend's current behaviour: `planType = "pro"`, so `isPro`
 * is `true` and the beta is non-breaking. Construct with
 * `new FakeBillingClient({ planType: "basic", isPro: false })` to exercise the
 * gated (non-Pro) paths.
 */
export class FakeBillingClient implements BillingClient {
  private entitlement: Entitlement;

  constructor(options: FakeBillingClientOptions = {}) {
    const planType = options.planType ?? "pro";
    const trialEndsAt = options.trialEndsAt ?? null;
    this.entitlement = {
      planType,
      isPro: options.isPro ?? planType === "pro",
      trialEndsAt,
    };
  }

  async getEntitlement(): Promise<Entitlement> {
    return { ...this.entitlement };
  }

  async purchasePro(): Promise<Entitlement> {
    // A successful purchase keeps any trial end date (for receipts) but flips
    // the plan to Pro.
    this.entitlement = {
      ...this.entitlement,
      planType: "pro",
      isPro: true,
    };
    return { ...this.entitlement };
  }

  async restore(): Promise<Entitlement> {
    return { ...this.entitlement };
  }
}

/**
 * The app-wide billing client. Replace the instance (not the call sites) when
 * the real RevenueCat client is ready — see the swap notes on
 * {@link BillingClient}.
 */
export const billingClient: BillingClient = new FakeBillingClient();
