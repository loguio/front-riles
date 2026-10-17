import React from "react";
import { Pressable, Text, View } from "react-native";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react-native";
import i18n from "../i18n";
import { BillingClient, FakeBillingClient } from "../services/billingClient";
import { PaywallModal } from "../components/billing/PaywallModal";
import { useProGate } from "./useProGate";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text: RNText } = require("react-native");
  const Icon = (props: { name?: string }) =>
    React.createElement(RNText, null, props.name ?? "icon");
  return { Feather: Icon, Ionicons: Icon, MaterialCommunityIcons: Icon };
});

const DAY_MS = 24 * 60 * 60 * 1000;
const futureTrial = () =>
  new Date(Date.now() + 9 * DAY_MS).toISOString();

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage("fr");
});

describe("useProGate (unit)", () => {
  it("runs the action and keeps the paywall closed when the user is Pro", async () => {
    const client = new FakeBillingClient();
    const { result } = renderHook(() => useProGate(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 10000,
    });

    const action = jest.fn();
    let ran = false;
    act(() => {
      ran = result.current.requirePro(action);
    });

    expect(ran).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.paywallVisible).toBe(false);
  });

  it("opens the paywall and skips the action when isPro is false", async () => {
    const client = new FakeBillingClient({ planType: "basic", isPro: false });
    const { result } = renderHook(() => useProGate(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 10000,
    });

    const action = jest.fn();
    act(() => {
      result.current.requirePro(action);
    });

    expect(action).not.toHaveBeenCalled();
    expect(result.current.paywallVisible).toBe(true);
  });

  it("treats a live trial as entitled and reports the remaining days", async () => {
    const client = new FakeBillingClient({
      planType: "basic",
      isPro: true,
      trialEndsAt: futureTrial(),
    });
    const { result } = renderHook(() => useProGate(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 10000,
    });

    expect(result.current.isPro).toBe(true);
    expect(result.current.state).toBe("trial");
    expect(result.current.trialDaysRemaining).toBe(9);

    const action = jest.fn();
    act(() => {
      result.current.requirePro(action);
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.paywallVisible).toBe(false);
  });

  it("subscribe upgrades to Pro and closes the paywall", async () => {
    const client = new FakeBillingClient({ planType: "basic", isPro: false });
    const { result } = renderHook(() => useProGate(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 10000,
    });

    act(() => result.current.openPaywall());
    expect(result.current.paywallVisible).toBe(true);

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.isPro).toBe(true);
    expect(result.current.state).toBe("pro");
    expect(result.current.paywallVisible).toBe(false);
  });

  it("surfaces an error and keeps the paywall open when subscribe rejects", async () => {
    const client: BillingClient = {
      getEntitlement: async () => ({
        planType: "basic",
        isPro: false,
        trialEndsAt: null,
      }),
      purchasePro: async () => {
        throw new Error("store unavailable");
      },
      restore: async () => ({
        planType: "basic",
        isPro: false,
        trialEndsAt: null,
      }),
    };
    const { result } = renderHook(() => useProGate(client));
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 10000,
    });

    act(() => result.current.openPaywall());
    expect(result.current.paywallVisible).toBe(true);

    let returned: unknown = "unset";
    await act(async () => {
      returned = await result.current.subscribe();
    });

    expect(returned).toBeNull();
    expect(result.current.subscribeError).toBe(true);
    // The paywall stays open so the user can retry.
    expect(result.current.paywallVisible).toBe(true);
  });
});

function Harness({
  client,
  onAction,
}: {
  client: BillingClient;
  onAction: () => void;
}) {
  const gate = useProGate(client);
  return (
    <View>
      <Text testID="ready">{String(!gate.isLoading)}</Text>
      <Pressable testID="gated-action" onPress={() => gate.requirePro(onAction)}>
        <Text>Coach</Text>
      </Pressable>
      <PaywallModal
        visible={gate.paywallVisible}
        state={gate.state}
        trialDaysRemaining={gate.trialDaysRemaining}
        onClose={gate.closePaywall}
        onSubscribe={gate.subscribe}
        error={gate.subscribeError}
      />
    </View>
  );
}

describe("gating at the point of action", () => {
  it("shows the paywall instead of running the action when not Pro", async () => {
    const onAction = jest.fn();
    const client = new FakeBillingClient({ planType: "basic", isPro: false });
    render(<Harness client={client} onAction={onAction} />);
    const ready = await screen.findByTestId("ready", {}, { timeout: 10000 });
    expect(ready.props.children).toBe("true");

    fireEvent.press(screen.getByTestId("gated-action"));

    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText("Passe à Riles Pro")).toBeTruthy();
  });

  it("runs the action and shows no paywall when Pro", async () => {
    const onAction = jest.fn();
    const client = new FakeBillingClient();
    render(<Harness client={client} onAction={onAction} />);
    const ready = await screen.findByTestId("ready", {}, { timeout: 10000 });
    expect(ready.props.children).toBe("true");

    fireEvent.press(screen.getByTestId("gated-action"));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Passe à Riles Pro")).toBeNull();
  });
});
