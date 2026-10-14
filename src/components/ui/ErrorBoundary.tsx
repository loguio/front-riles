import React from "react";
import { ErrorState } from "./ErrorState";

export interface ErrorBoundaryProps {
  /** Contenu protégé : un plantage ici bascule sur l'écran de repli. */
  children: React.ReactNode;
  /** Titre de l'état d'erreur (personnalisable par onglet). */
  title?: string;
  /** Titre de repli quand l'erreur ne porte aucun texte exploitable. */
  fallbackMessage?: string;
  /** Appelé quand l'utilisateur demande une nouvelle tentative. */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Message visible : on montre la cause réelle quand elle existe, sinon un
 * texte d'action plutôt qu'une trace brute.
 */
function describeError(error: Error | null, fallbackMessage?: string): string {
  const message = error?.message?.trim();
  if (message) return message;
  return (
    fallbackMessage ??
    "L'écran a rencontré une erreur inattendue. Réessaie, ou relance l'application si le problème persiste."
  );
}

/**
 * RILES-041 : première barrière de sécurité de l'application.
 *
 * Avant cette classe, une exception pendant le rendu faisait tomber tout
 * l'arbre React (écran blanc) et les erreurs étaient avalées par des
 * `console.error` dans les actions. Ici l'erreur est journalisée avec sa pile
 * de composants PUIS rendue à l'utilisateur sous forme d'un état d'erreur
 * récupérable (écran `ErrorState` + bouton « Réessayer ») qui re-rend les
 * enfants au lieu de figer l'app.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // RILES-041 : l'erreur n'est pas avalée — elle reste tracée (avec le
    // composant fautif) pour le débogage, en plus de l'état visible.
    console.error(
      "[ErrorBoundary]",
      error?.message ?? error,
      info?.componentStack ?? "",
    );
  }

  handleRetry = (): void => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <ErrorState
          title={this.props.title ?? "Une erreur inattendue est survenue"}
          message={describeError(error, this.props.fallbackMessage)}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
