import PostHog from "posthog-react-native";
import { Platform } from "react-native";

// Configuration PostHog avec fallback automatique sur la clé du projet Riles
const POSTHOG_API_KEY =
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY ||
  "phc_up5r2TeCUma3Fmq6LHyieLHeJ7GV9MkJY5gCrDi4MfEb";

const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

/**
 * Instance principale du client PostHog pour l'application mobile.
 * Initialisée de manière sécurisée (ne bloque jamais l'application si hors-ligne ou clé invalide).
 */
export const posthogClient = new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_HOST,
  // Enregistrement des propriétés par défaut de l'appareil
  customAppProperties: (properties) => ({
    ...properties,
    platform: "mobile",
    os_name: Platform.OS,
    os_version: String(Platform.Version),
    app_environment: __DEV__ ? "development" : "production",
  }),
  // Capture les cycles de vie de l'application (Background, Foreground, Ouvertures)
  captureAppLifecycleEvents: true,
  // Mise en mémoire cache sécurisée
  persistence: "file",
});

/**
 * Service Analytics unifié pour toute l'application.
 * Facilite le tracking sans dépendre directement de l'instance PostHog partout.
 */
export const analytics = {
  /**
   * Client sous-jacent si besoin d'accès direct
   */
  client: posthogClient,

  /**
   * Enregistre la visite d'une page / d'un écran.
   * @param screenName Nom clair de l'écran (ex: "onboarding", "calendar", "chat")
   * @param properties Propriétés additionnelles (ex: onglet sélectionné, filtres actifs)
   */
  trackScreen(screenName: string, properties?: Record<string, any>) {
    try {
      const sanitizedName = screenName.replace(/^\//, "") || "home";
      posthogClient.screen(sanitizedName, {
        screen_name: sanitizedName,
        platform: "mobile",
        ...properties,
      });

      if (__DEV__) {
        console.log(`[Analytics] 📱 Écran visité : ${sanitizedName}`, properties || "");
      }
    } catch (err) {
      console.warn("[Analytics] Erreur lors du trackScreen :", err);
    }
  },

  /**
   * Enregistre un événement utilisateur ou une interaction clé.
   * @param eventName Nom de l'événement (ex: "onboarding_step_viewed", "chat_message_sent")
   * @param properties Données de contexte pour analyser la conversion
   */
  trackEvent(eventName: string, properties?: Record<string, any>) {
    try {
      posthogClient.capture(eventName, {
        platform: "mobile",
        timestamp: new Date().toISOString(),
        ...properties,
      });

      if (__DEV__) {
        console.log(`[Analytics] ⚡ Événement : ${eventName}`, properties || "");
      }
    } catch (err) {
      console.warn("[Analytics] Erreur lors du trackEvent :", err);
    }
  },

  /**
   * Associe les événements futurs à un utilisateur spécifique (après inscription ou connexion).
   * @param userId Identifiant unique de l'utilisateur (ex: UUID Supabase)
   * @param traits Caractéristiques produit (ex: email, nom, statut d'abonnement, objectif)
   */
  identifyUser(userId: string, traits?: Record<string, any>) {
    try {
      posthogClient.identify(userId, {
        platform: "mobile",
        ...traits,
      });

      if (__DEV__) {
        console.log(`[Analytics] 👤 Utilisateur identifié : ${userId}`, traits || "");
      }
    } catch (err) {
      console.warn("[Analytics] Erreur lors du identifyUser :", err);
    }
  },

  /**
   * Réinitialise l'identité utilisateur lors d'une déconnexion (signOut).
   * Les événements futurs seront à nouveau anonymes.
   */
  resetUser() {
    try {
      posthogClient.reset();
      if (__DEV__) {
        console.log("[Analytics] 🔒 Identité utilisateur réinitialisée (déconnexion)");
      }
    } catch (err) {
      console.warn("[Analytics] Erreur lors du resetUser :", err);
    }
  },

  /**
   * Force l'envoi immédiat de la file d'attente d'événements vers les serveurs PostHog.
   */
  async flush() {
    try {
      await posthogClient.flush();
    } catch (err) {
      console.warn("[Analytics] Erreur lors du flush :", err);
    }
  },
};
