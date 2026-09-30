import {
  OnboardingState,
  ConnectedApp,
  GoalReformulationResult,
  ExtractedRuleItem,
  StravaSixMonthsSummary,
} from "../types";
import { apiClient } from "./apiClient";
import {
  CONNECTED_APPS_CATALOG,
  DEFAULT_STRAVA_SIX_MONTHS_SUMMARY,
} from "../mock/mockData";

const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  currentStep: 1,
  authMethod: null,
  userEmail: "",
  mainGoal: "Me préparer pour mon premier semi-marathon sans me blesser",
  selectedSports: ["running"],
  connectedApps: ["garmin", "strava"],
  selectedPlan: "pro",
  isCompleted: false,
  stravaSixMonthsSummary: DEFAULT_STRAVA_SIX_MONTHS_SUMMARY,
};

function buildLocalGoalReformulation(rawGoal: string): GoalReformulationResult {
  const lower = rawGoal.toLowerCase();

  let title = "Semi-marathon";
  let distanceKm = 21.1;
  if (lower.includes("paris") && lower.includes("semi")) {
    title = "Semi-marathon de Paris";
  } else if (lower.includes("ultra")) {
    const kmMatch = lower.match(/(\d{2,3})\s*km/i);
    distanceKm = kmMatch ? parseInt(kmMatch[1], 10) : 100;
    title = `Ultra-Trail (${distanceKm} km)`;
  } else if (lower.includes("marathon") && !lower.includes("semi")) {
    title = "Préparation Marathon";
    distanceKm = 42.2;
  } else if (lower.includes("10 km") || lower.includes("10km")) {
    title = "Course 10 km";
    distanceKm = 10;
  }

  const chronoMatch = lower.match(/(\d\s*h\s*\d{0,2}|\d{2}\s*min)/i);
  const target = chronoMatch
    ? `Objectif ${chronoMatch[1].replace(/\s+/g, "")}`
    : lower.includes("sans me blesser")
      ? "Finir sereinement sans blessure"
      : "Passer sous les 2h";

  let weeksRemaining = 12;
  const monthsMatch = lower.match(/(\d+)\s*mois/i);
  const weeksMatch = lower.match(/(\d+)\s*semaine/i);
  if (weeksMatch) {
    weeksRemaining = parseInt(weeksMatch[1], 10);
  } else if (monthsMatch) {
    weeksRemaining = parseInt(monthsMatch[1], 10) * 4;
  }

  const extractedRules: ExtractedRuleItem[] = [];
  const days = [
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
    "dimanche",
  ];
  const blockedDays = days.filter((d) => lower.includes(d));
  if (blockedDays.length > 0) {
    extractedRules.push({
      title: "Jours sanctuarisés",
      description: `Aucune séance programmée le ${blockedDays.join(", ")}.`,
      icon: "calendar-lock",
    });
  }
  if (
    lower.includes("mollet") ||
    lower.includes("genou") ||
    lower.includes("sans me blesser") ||
    lower.includes("blessure")
  ) {
    extractedRules.push({
      title: "Prévention & Progressivité",
      description:
        "Protection articulaire/musculaire prioritaire (+10 % de charge hebdo max).",
      icon: "bullseye-arrow",
    });
  }

  return {
    reformulatedGoal: `Préparer « ${title} — ${target} » sur ${weeksRemaining} semaines (allures calibrées sur tes 6 derniers mois Strava & fréquence cardiaque).`,
    extractedGoal: {
      title,
      target,
      raceDate: `Dans ${weeksRemaining} semaines`,
      weeksRemaining,
      distanceKm,
    },
    extractedRules,
    targetPaces: {
      easyPaceZ2: "5:38/km – 5:58/km",
      marathonPaceZ3: "5:10/km",
      thresholdPaceZ4: "4:48/km",
      intervalPaceZ5: "4:26/km",
      targetRacePace: "4:56/km",
    },
    eligibility: {
      status: "ELIGIBLE",
      isRealistic: true,
      pedagogicalMessage:
        "Objectif cohérent avec tes 6 derniers mois Strava (~36,8 km/sem sur le dernier mois).",
    },
  };
}

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
   * Récupère l'URL d'autorisation OAuth2 Strava
   */
  async getStravaOAuthUrl(redirectUri?: string): Promise<{
    authorizeUrl: string;
    clientId: string;
    redirectUri: string;
    isLiveConfigured: boolean;
  }> {
    try {
      return await apiClient.get("onboarding/oauth/strava/url", {
        params: redirectUri ? { redirectUri } : undefined,
      });
    } catch {
      return {
        authorizeUrl: "https://www.strava.com/oauth/authorize",
        clientId: "riles_strava_demo_client",
        redirectUri: redirectUri || "http://localhost:8081/onboarding",
        isLiveConfigured: false,
      };
    }
  },

  /**
   * Récupère et sauvegarde les 6 derniers mois de données Strava dans l'application et le contexte IA
   */
  async syncStravaSixMonths(options?: {
    code?: string;
    redirectUri?: string;
    pushToken?: string;
    forceRefresh?: boolean;
  }): Promise<StravaSixMonthsSummary> {
    try {
      return await apiClient.post<StravaSixMonthsSummary>(
        "onboarding/strava/sync-six-months",
        options || {},
      );
    } catch (error) {
      console.warn(
        "API onboardingService.syncStravaSixMonths fallback local:",
        error,
      );
      return {
        ...DEFAULT_STRAVA_SIX_MONTHS_SUMMARY,
        syncedAt: new Date().toISOString(),
      };
    }
  },

  /**
   * Reformule l'objectif libre avec l'IA, extrait les LifeRules et vérifie l'éligibilité
   */
  async reformulateGoal(rawGoal: string): Promise<GoalReformulationResult> {
    try {
      return await apiClient.post<GoalReformulationResult>(
        "onboarding/reformulate-goal",
        { rawGoal },
      );
    } catch (error) {
      console.warn(
        "API onboardingService.reformulateGoal fallback local:",
        error,
      );
      return buildLocalGoalReformulation(rawGoal);
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
   * Finalise l'onboarding, synchronise les 6 mois de données Strava et génère le plan d'entraînement
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
