import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error react-test-renderer n'est pas couvert par les déclarations de types du projet
import TestRenderer from "react-test-renderer";

/**
 * RILES-041 — régression : un écran qui lève pendant le rendu doit basculer
 * sur l'état d'erreur récupérable (message + « Réessayer ») au lieu de faire
 * tomber l'arbre React (écran blanc).
 *
 * `react-test-renderer` joue le rôle du client React : `react-dom/server`
 * n'exécute jamais les error boundaries côté serveur, il ne pourrait donc pas
 * vérifier ce comportement. Aucun émulateur, aucun appel réseau.
 */
vi.mock("react-native", async () => {
  const ReactModule = await import("react");
  const host = (type: string) => (props: Record<string, unknown>) =>
    ReactModule.createElement(type as any, props as any, props.children as any);
  return {
    View: host("View"),
    Text: host("Text"),
    TouchableOpacity: host("TouchableOpacity"),
    ActivityIndicator: host("ActivityIndicator"),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (styles: unknown) => styles,
    },
  };
});

vi.mock("@expo/vector-icons", () => ({
  Feather: () => null,
  Ionicons: () => null,
  MaterialCommunityIcons: () => null,
}));

import { ErrorBoundary } from "./ErrorBoundary";

/** Écran sain : doit traverser la frontière sans changement. */
const HealthyScreen = () => React.createElement("Text", null, "contenu sain");

/** Écran qui plante pendant le rendu. */
const CrashingScreen = () => {
  throw new Error("Écran coach en échec");
};

describe("RILES-041: a crashing screen shows the fallback, not a dead tree", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a recoverable error state instead of crashing the tree", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    // Aucune exception ne doit sortir de ce rendu : c'est la frontière qui
    // prend le relais.
    const tree = TestRenderer.create(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(CrashingScreen),
      ),
    );

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Écran coach en échec");
    expect(json).toContain("Réessayer");
    expect(json).not.toContain("contenu sain");

    // L'erreur n'est pas avalée : elle reste journalisée avec son contexte.
    const logged = consoleError.mock.calls.some((call) =>
      String(call[0]).includes("[ErrorBoundary]"),
    );
    expect(logged).toBe(true);
  });

  it("renders children untouched when nothing throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const tree = TestRenderer.create(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(HealthyScreen),
      ),
    );

    expect(JSON.stringify(tree.toJSON())).toContain("contenu sain");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("recovers the subtree when the user taps Réessayer", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    let shouldThrow = true;
    const FlakyScreen = () => {
      if (shouldThrow) {
        throw new Error("échec transitoire");
      }
      return React.createElement("Text", null, "écran réparé");
    };

    const tree = TestRenderer.create(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(FlakyScreen),
      ),
    );
    expect(JSON.stringify(tree.toJSON())).toContain("échec transitoire");

    // L'écran redevient sain, l'utilisateur relance : les enfants reprennent.
    shouldThrow = false;
    const retryButtons = tree.root.findAllByType("TouchableOpacity");
    expect(retryButtons.length).toBeGreaterThan(0);
    retryButtons[0].props.onPress();

    expect(JSON.stringify(tree.toJSON())).toContain("écran réparé");
    expect(JSON.stringify(tree.toJSON())).not.toContain("échec transitoire");
  });
});
