import { useCallback, useState } from "react";
import { billingClient, BillingClient } from "../services/billingClient";
import { Entitlement } from "../types";
import { useEntitlement, UseEntitlementResult } from "./useEntitlement";

export interface UseProGateResult extends UseEntitlementResult {
  /** Whether the paywall modal should be shown. */
  paywallVisible: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  /**
   * Soft gate for a Pro action: runs `action` immediately when the user is
   * entitled (or entitlement is still loading, so the beta never hard-blocks),
   * otherwise opens the paywall and returns `false`.
   */
  requirePro: (action: () => void) => boolean;
  isSubscribing: boolean;
  /** True when the last `subscribe()` attempt rejected (paywall stays open). */
  subscribeError: boolean;
  subscribe: () => Promise<Entitlement | null>;
}

/**
 * Combines the entitlement state with paywall visibility and a `requirePro`
 * gate, so a screen can guard a single action without a hard app-wide lock.
 *
 * Usage:
 *   const gate = useProGate();
 *   onPress={() => gate.requirePro(() => router.push("/chat"))}
 *   <PaywallModal
 *     visible={gate.paywallVisible}
 *     state={gate.state}
 *     trialDaysRemaining={gate.trialDaysRemaining}
 *     onClose={gate.closePaywall}
 *     onSubscribe={gate.subscribe}
 *     onRestore={gate.restore}
 *     isSubscribing={gate.isSubscribing}
 *     error={gate.subscribeError}
 *   />
 */
export function useProGate(
  client: BillingClient = billingClient,
): UseProGateResult {
  const { purchasePro, isLoading, isPro, ...entitlement } =
    useEntitlement(client);
  const [paywallVisible, setPaywallVisible] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [subscribeError, setSubscribeError] = useState<boolean>(false);

  // Clear any stale subscribe error when the paywall is opened or dismissed,
  // so a previous failure is not shown on the next visit.
  const openPaywall = useCallback(() => {
    setSubscribeError(false);
    setPaywallVisible(true);
  }, []);
  const closePaywall = useCallback(() => {
    setSubscribeError(false);
    setPaywallVisible(false);
  }, []);

  const requirePro = useCallback(
    (action: () => void) => {
      // While the entitlement is still loading we optimistically allow the
      // action: the backend defaults to Pro, so gating must never block the
      // beta on a transient state.
      if (isLoading || isPro) {
        action();
        return true;
      }
      openPaywall();
      return false;
    },
    [isLoading, isPro, openPaywall],
  );

  const subscribe = useCallback(async () => {
    setIsSubscribing(true);
    setSubscribeError(false);
    try {
      const next = await purchasePro();
      setPaywallVisible(false);
      return next;
    } catch {
      // A real RevenueCat client rejects on failure; keep the paywall open so
      // the user can retry and surface the inline error to the caller.
      setSubscribeError(true);
      return null;
    } finally {
      setIsSubscribing(false);
    }
  }, [purchasePro]);

  return {
    entitlement: entitlement.entitlement,
    state: entitlement.state,
    isPro,
    trialDaysRemaining: entitlement.trialDaysRemaining,
    isLoading,
    refresh: entitlement.refresh,
    restore: entitlement.restore,
    purchasePro,
    paywallVisible,
    openPaywall,
    closePaywall,
    requirePro,
    isSubscribing,
    subscribeError,
    subscribe,
  };
}
