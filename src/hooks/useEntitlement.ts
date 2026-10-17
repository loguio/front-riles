import { useCallback, useEffect, useState } from "react";
import { billingClient, BillingClient } from "../services/billingClient";
import { Entitlement, EntitlementState } from "../types";
import {
  getEntitlementState,
  trialDaysRemaining as computeTrialDaysRemaining,
} from "../utils/entitlements";

export interface UseEntitlementResult {
  entitlement: Entitlement | null;
  state: EntitlementState;
  /** Pro when the subscription is active OR the trial is still running. */
  isPro: boolean;
  trialDaysRemaining: number;
  isLoading: boolean;
  refresh: () => Promise<Entitlement>;
  purchasePro: () => Promise<Entitlement>;
  restore: () => Promise<Entitlement>;
}

/**
 * Loads and mutates the current entitlement through a {@link BillingClient}.
 *
 * Defaults to the app-wide `billingClient`; pass a client explicitly (e.g. a
 * {@link FakeBillingClient}) to control the state in tests. Swapping the real
 * RevenueCat client is a one-line change at the call site or in the singleton.
 */
export function useEntitlement(
  client: BillingClient = billingClient,
): UseEntitlementResult {
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    client
      .getEntitlement()
      .then((next) => {
        if (active) setEntitlement(next);
      })
      .catch(() => {
        if (active) setEntitlement(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client]);

  const refresh = useCallback(async () => {
    const next = await client.getEntitlement();
    setEntitlement(next);
    return next;
  }, [client]);

  const purchasePro = useCallback(async () => {
    const next = await client.purchasePro();
    setEntitlement(next);
    return next;
  }, [client]);

  const restore = useCallback(async () => {
    const next = await client.restore();
    setEntitlement(next);
    return next;
  }, [client]);

  const state = getEntitlementState(entitlement);

  return {
    entitlement,
    state,
    isPro: state !== "basic",
    trialDaysRemaining: computeTrialDaysRemaining(entitlement?.trialEndsAt),
    isLoading,
    refresh,
    purchasePro,
    restore,
  };
}
