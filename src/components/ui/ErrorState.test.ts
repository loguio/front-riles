import React from "react";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error react-dom/server n'est pas couvert par les déclarations de types du projet
import { renderToStaticMarkup } from "react-dom/server";

/**
 * RILES-015 — l'état d'erreur doit réellement s'afficher (message + bouton
 * Réessayer) sans planter. Les primitives React Native sont remplacées par
 * des éléments DOM neutres : aucun émulateur, aucun appel réseau.
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

import { ErrorBanner, ErrorState } from "./ErrorState";

describe("error state UI", () => {
  it("ErrorState renders the message and a retry action", () => {
    const html = renderToStaticMarkup(
      React.createElement(ErrorState, {
        message: "Connexion au serveur impossible.",
        onRetry: () => undefined,
      }),
    );

    expect(html).toContain("Connexion au serveur impossible.");
    expect(html).toContain("Réessayer");
    expect(html).toContain("Données indisponibles");
  });

  it("ErrorBanner renders an inline error with a retry link", () => {
    const html = renderToStaticMarkup(
      React.createElement(ErrorBanner, {
        message: "Erreur de chargement des données",
        onRetry: () => undefined,
      }),
    );

    expect(html).toContain("Erreur de chargement des données");
    expect(html).toContain("Réessayer");
  });

  it("renders without a retry control when no handler is provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(ErrorState, { message: "Erreur inconnue" }),
    );

    expect(html).toContain("Erreur inconnue");
    expect(html).not.toContain("Réessayer");
  });
});
