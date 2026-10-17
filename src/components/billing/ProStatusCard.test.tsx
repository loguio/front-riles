import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import i18n from "../../i18n";
import { ProStatusCard } from "./ProStatusCard";

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

describe("ProStatusCard", () => {
  it("shows the free plan and an accessible upgrade affordance on BASIC", () => {
    const onUpgrade = jest.fn();
    render(<ProStatusCard state="basic" onUpgrade={onUpgrade} />);

    expect(screen.getByText("Offre gratuite")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Ouvrir l'offre Pro"));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("shows the active subscription for Pro users", () => {
    render(<ProStatusCard state="pro" onUpgrade={jest.fn()} />);

    expect(screen.getByText("Abonnement Pro actif")).toBeTruthy();
    expect(screen.queryByText("Offre gratuite")).toBeNull();
  });

  it("shows a neutral placeholder while loading (no upsell)", () => {
    render(<ProStatusCard state="basic" isLoading onUpgrade={jest.fn()} />);

    expect(screen.getByText("Chargement...")).toBeTruthy();
    expect(screen.queryByText("Offre gratuite")).toBeNull();
    expect(screen.queryByLabelText("Ouvrir l'offre Pro")).toBeNull();
  });
});
