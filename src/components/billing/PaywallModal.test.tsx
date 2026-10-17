import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import i18n from "../../i18n";
import { PaywallModal } from "./PaywallModal";

// The real vector-icon sets load fonts through expo-font, which is unavailable
// under Jest; render a lightweight Text node instead.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Icon = (props: { name?: string }) =>
    React.createElement(Text, null, props.name ?? "icon");
  return { Feather: Icon, Ionicons: Icon, MaterialCommunityIcons: Icon };
});

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage("fr");
});

describe("PaywallModal", () => {
  it("renders the Pro offer, 14-day trial and CTA in French", () => {
    render(
      <PaywallModal
        visible
        state="basic"
        onClose={jest.fn()}
        onSubscribe={jest.fn()}
      />,
    );

    expect(screen.getByText("Passe à Riles Pro")).toBeTruthy();
    expect(screen.getByText("14 jours d'essai gratuit")).toBeTruthy();
    expect(screen.getByText("Commencer l'essai gratuit")).toBeTruthy();
    expect(screen.getByText("Adaptation dynamique")).toBeTruthy();
  });

  it("renders the English locale", async () => {
    await i18n.changeLanguage("en");

    render(
      <PaywallModal
        visible
        state="basic"
        onClose={jest.fn()}
        onSubscribe={jest.fn()}
      />,
    );

    expect(screen.getByText("Go Pro with Riles")).toBeTruthy();
    expect(screen.getByText("14-day free trial")).toBeTruthy();
    expect(screen.getByText("Start the free trial")).toBeTruthy();
  });

  it("shows the remaining trial days while on trial", () => {
    render(
      <PaywallModal
        visible
        state="trial"
        trialDaysRemaining={9}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId("paywall-trial-days")).toBeTruthy();
    expect(screen.getByText("Essai gratuit : 9 jours restants")).toBeTruthy();
  });

  it("does not show trial days on the BASIC plan", () => {
    render(<PaywallModal visible state="basic" onClose={jest.fn()} />);

    expect(screen.queryByTestId("paywall-trial-days")).toBeNull();
  });

  it("shows a non-blocking confirmation instead of the CTA when already Pro", () => {
    render(<PaywallModal visible state="pro" onClose={jest.fn()} />);

    expect(screen.getByText("Tu es déjà Pro 🎉")).toBeTruthy();
    expect(screen.queryByText("Commencer l'essai gratuit")).toBeNull();
    // Still dismissible.
    expect(screen.getByTestId("paywall-dismiss")).toBeTruthy();
  });

  it("triggers subscribe from the CTA and close from the dismiss button", () => {
    const onSubscribe = jest.fn();
    const onClose = jest.fn();

    render(
      <PaywallModal
        visible
        state="basic"
        onClose={onClose}
        onSubscribe={onSubscribe}
      />,
    );

    fireEvent.press(screen.getByText("Commencer l'essai gratuit"));
    expect(onSubscribe).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("paywall-dismiss"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing while hidden", () => {
    render(<PaywallModal visible={false} state="basic" onClose={jest.fn()} />);

    expect(screen.queryByTestId("paywall-modal")).toBeNull();
  });

  it("confirms a successful restore instead of leaving the CTA inert", async () => {
    const onRestore = jest.fn().mockResolvedValue({
      planType: "pro",
      isPro: true,
      trialEndsAt: null,
    });
    render(
      <PaywallModal
        visible
        state="basic"
        onClose={jest.fn()}
        onRestore={onRestore}
      />,
    );

    fireEvent.press(screen.getByText("Restaurer mes achats"));

    expect(await screen.findByText("Achats restaurés")).toBeTruthy();
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it("reports when there is nothing to restore", async () => {
    const onRestore = jest.fn().mockResolvedValue({
      planType: "basic",
      isPro: false,
      trialEndsAt: null,
    });
    render(
      <PaywallModal
        visible
        state="basic"
        onClose={jest.fn()}
        onRestore={onRestore}
      />,
    );

    fireEvent.press(screen.getByText("Restaurer mes achats"));

    expect(await screen.findByText("Aucun achat à restaurer")).toBeTruthy();
  });

  it("surfaces an inline error and stays open when restore rejects", async () => {
    const onRestore = jest.fn().mockRejectedValue(new Error("store down"));
    render(
      <PaywallModal
        visible
        state="basic"
        onClose={jest.fn()}
        onRestore={onRestore}
      />,
    );

    fireEvent.press(screen.getByText("Restaurer mes achats"));

    expect(
      await screen.findByText("Une erreur est survenue. Réessaie."),
    ).toBeTruthy();
    expect(screen.getByTestId("paywall-modal")).toBeTruthy();
  });

  it("shows the inline error when a subscribe attempt failed", () => {
    render(<PaywallModal visible state="basic" onClose={jest.fn()} error />);

    expect(screen.getByTestId("paywall-error")).toBeTruthy();
  });
});
