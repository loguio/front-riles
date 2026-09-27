import { OnboardingState, ConnectedApp } from "../types";
import { apiClient } from "./apiClient";
import { CONNECTED_APPS_CATALOG } from "../mock/mockData";

const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  currentStep: 1,
  authMethod: null,
  userEmail: "",
  mainGoal: "Me préparer pour mon premier semi-marathon sans me blesser",
  selectedSports: ["running"],
  connectedApps: ["garmin", "strava"],
  selectedPlan: "pro",
  isCompleted: false,
};

export const onboardingService = {
  /**
   * Récupère l'état courant de l'onboarding depuis NestJS
   */
  async getOnboardingState(): Promise<OnboardingState> {
    try {
      return await apiClient.get<OnboardingState>("onboarding/state");
    } catch (error) {
      console.warn("API onboardingService.getOnboardingState fallback:", error);
      return DEFAULT_ONBOARDING_STATE;
    }
  },

  /**
   * Récupère le catalogue des applications sportives connectables
   */
  async getAppsCatalog(): Promise<ConnectedApp[]> {
    try {
      return await apiClient.get<ConnectedApp[]>("onboarding/apps");
    } catch (error) {
      console.warn("API onboardingService.getAppsCatalog fallback:", error);
      return CONNECTED_APPS_CATALOG;
    }
  },

  /**
   * Enregistre les données d'une étape de l'onboarding
   */
  async saveStepData(
    updates: Partial<OnboardingState>,
  ): Promise<OnboardingState> {
    try {
      return await apiClient.post<OnboardingState>("onboarding/step", updates);
    } catch (error) {
      console.warn("API onboardingService.saveStepData fallback:", error);
      return { ...DEFAULT_ONBOARDING_STATE, ...updates };
    }
  },

  /**
   * Finalise l'onboarding et initialise le compte
   */
  async completeOnboarding(
    finalData?: Partial<OnboardingState>,
  ): Promise<OnboardingState> {
    try {
      return await apiClient.post<OnboardingState>(
        "onboarding/complete",
        finalData || {},
      );
    } catch (error) {
      console.warn("API onboardingService.completeOnboarding fallback:", error);
      return { ...DEFAULT_ONBOARDING_STATE, ...finalData, isCompleted: true };
    }
  },

  /**
   * Réinitialise l'onboarding pour tests
   */
  async resetOnboarding(): Promise<OnboardingState> {
    try {
      return await apiClient.post<OnboardingState>("onboarding/reset");
    } catch (error) {
      console.warn("API onboardingService.resetOnboarding fallback:", error);
      return {
        ...DEFAULT_ONBOARDING_STATE,
        isCompleted: false,
        currentStep: 1,
      };
    }
  },
};
