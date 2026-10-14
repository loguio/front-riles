import {
  OnboardingState,
  ConnectedApp,
  GoalReformulationResult,
  StravaSixMonthsSummary,
} from "../types";
import { apiClient, ApiError } from "./apiClient";

/**
 * RILES-015 : plus aucun repli local.
 * Les reformulations d'objectif, plans générés et résumés Strava proviennent
 * exclusivement du backend ; en cas d'échec l'erreur remonte et l'écran
 * affiche un état d'erreur (aucun contenu fabriqué).
 */
export const onboardingService = {
  /**
   * Récupère l'état courant de l'onboarding depuis NestJS
   */
  async getOnboardingState(): Promise<OnboardingState> {
    return apiClient.get<OnboardingState>("onboarding/state");
  },

  /**
   * Récupère le catalogue des applications sportives connectables
   */
  async getAppsCatalog(): Promise<ConnectedApp[]> {
    const apps = await apiClient.get<ConnectedApp[]>("onboarding/apps");
    if (!Array.isArray(apps)) {
      throw new ApiError("Catalogue d'applications invalide", 502);
    }
    return apps;
  },

  /**
   * Récupère l'URL d'autorisation OAuth2 Strava
   */
  async getStravaOAuthUrl(redirectUri?: string): Promise<{
    authorizeUrl: string;
    clientId: string;
    redirectUri: string;
    isLiveConfigured: boolean;
  }> {
    return apiClient.get("onboarding/oauth/strava/url", {
      params: redirectUri ? { redirectUri } : undefined,
    });
  },

  /**
   * Récupère et sauvegarde les 6 derniers mois de données Strava
   */
  async syncStravaSixMonths(options?: {
    code?: string;
    redirectUri?: string;
    pushToken?: string;
    forceRefresh?: boolean;
  }): Promise<StravaSixMonthsSummary> {
    return apiClient.post<StravaSixMonthsSummary>(
      "onboarding/strava/sync-six-months",
      options || {},
    );
  },

  /**
   * Reformule l'objectif libre avec l'IA, extrait les LifeRules et vérifie l'éligibilité
   */
  async reformulateGoal(rawGoal: string): Promise<GoalReformulationResult> {
    return apiClient.post<GoalReformulationResult>(
      "onboarding/reformulate-goal",
      { rawGoal },
    );
  },

  /**
   * Enregistre les données d'une étape de l'onboarding
   */
  async saveStepData(
    updates: Partial<OnboardingState>,
  ): Promise<OnboardingState> {
    return apiClient.post<OnboardingState>("onboarding/step", updates);
  },

  /**
   * Finalise l'onboarding et génère le plan d'entraînement (backend)
   */
  async completeOnboarding(
    finalData?: Partial<OnboardingState>,
  ): Promise<OnboardingState> {
    return apiClient.post<OnboardingState>(
      "onboarding/complete",
      finalData || {},
    );
  },

  /**
   * Réinitialise l'onboarding
   */
  async resetOnboarding(): Promise<OnboardingState> {
    return apiClient.post<OnboardingState>("onboarding/reset");
  },
};
