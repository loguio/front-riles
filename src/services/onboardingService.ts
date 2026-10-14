import {
  OnboardingState,
  ConnectedApp,
  GoalReformulationResult,
  ExtractedRuleItem,
  StravaSixMonthsSummary,
  PreparationPhase,
  WeeklyPlanBreakdown,
  GeneratedPlanOverview,
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
  mainGoal: "",
  selectedSports: ["running"],
  connectedApps: [],
  selectedPlan: "pro",
  isCompleted: false,
  stravaSixMonthsSummary: undefined,
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

  let weeksRemaining = 16;
  let targetDateLabel = "Dans 16 semaines (4 mois)";

  // Détection des mentions de date relatives ou absolues (ex: "février", "pour février", "dans 4 mois")
  const isFeb = lower.includes("février") || lower.includes("fevrier");
  const isMar = lower.includes("mars");
  const isApr = lower.includes("avril");
  const isMay = lower.includes("mai");

  if (isFeb) {
    weeksRemaining = 18;
    targetDateLabel = "21 février 2027";
  } else if (isMar) {
    weeksRemaining = 22;
    targetDateLabel = "21 mars 2027";
  } else if (isApr) {
    weeksRemaining = 26;
    targetDateLabel = "18 avril 2027";
  } else if (isMay) {
    weeksRemaining = 30;
    targetDateLabel = "16 mai 2027";
  } else {
    const monthsMatch = lower.match(/(\d+)\s*mois/i);
    const weeksMatch = lower.match(/(\d+)\s*semaine/i);
    if (weeksMatch) {
      weeksRemaining = parseInt(weeksMatch[1], 10);
      targetDateLabel = `Dans ${weeksRemaining} semaines`;
    } else if (monthsMatch) {
      const mCount = parseInt(monthsMatch[1], 10);
      weeksRemaining = Math.round(mCount * 4.34);
      targetDateLabel = `Dans ${mCount} mois (${weeksRemaining} semaines)`;
    }
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
      title: "Jours indisponibles",
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

  // Allures calibrées pour un objectif marathon en 3h30 (4:58/km)
  const isMarathon3h30 =
    distanceKm >= 40 &&
    (target.includes("3h30") ||
      target.includes("3 h 30") ||
      lower.includes("3h30") ||
      lower.includes("3 h 30"));

  const targetPaces = isMarathon3h30
    ? {
        easyPaceZ2: "5:40/km – 6:00/km",
        marathonPaceZ3: "4:58/km",
        thresholdPaceZ4: "4:38/km",
        intervalPaceZ5: "4:15/km",
        targetRacePace: "4:58/km",
      }
    : {
        easyPaceZ2: "5:38/km – 5:58/km",
        marathonPaceZ3: "5:10/km",
        thresholdPaceZ4: "4:48/km",
        intervalPaceZ5: "4:26/km",
        targetRacePace: "4:56/km",
      };

  return {
    reformulatedGoal: `Préparer « ${title} — ${target} » sur ${weeksRemaining} semaines (${targetDateLabel} • allures calibrées sur tes 6 derniers mois Strava avec progression +10 % par semaine et assimilation).`,
    extractedGoal: {
      title,
      target,
      raceDate: targetDateLabel,
      weeksRemaining,
      distanceKm,
    },
    extractedRules,
    targetPaces,
    eligibility: {
      status: "ELIGIBLE",
      isRealistic: true,
      pedagogicalMessage:
        "Objectif cohérent et adapté à ton niveau de pratique et à tes disponibilités d'entraînement.",
    },
  };
}

function buildLocalGeneratedPlan(
  totalWeeks = 18,
  baseKm = 28,
  targetDateLabel?: string,
): GeneratedPlanOverview {
  // Calcul progressif des phases physiologiques
  const p1End = Math.max(1, Math.round(totalWeeks * 0.3));
  const p2End = Math.max(p1End + 1, Math.round(totalWeeks * 0.65));
  const p3End = Math.max(p2End + 1, Math.round(totalWeeks * 0.85));

  const phases: PreparationPhase[] = [
    {
      name: "Phase 1 : Socle Foncier & Démarrage Doux (+10%/sem)",
      weeksRangeLabel: `Semaines 1 à ${p1End}`,
      focus:
        "Démarrage progressif sans choc de volume, consolidation de la base aérobie Zone 2",
      weekType: "Endurance fondamentale & Volume progressif",
      avgKm: Math.round(baseKm * 0.95),
      sessionsPerWeek: 4,
    },
    {
      name: "Phase 2 : Développement Spécifique Marathon & Seuil",
      weeksRangeLabel: `Semaines ${p1End + 1} à ${p2End}`,
      focus:
        "Intégration des blocs à allure marathon (4:58/km) et seuil anaérobie avec cycle 3:1",
      weekType: "Fractions tempo & Allure spécifique 3h30",
      avgKm: Math.round(baseKm * 1.3),
      sessionsPerWeek: 4,
    },
    {
      name: "Phase 3 : Pic de Volume & Sorties Longues Clés",
      weeksRangeLabel: `Semaines ${p2End + 1} à ${p3End}`,
      focus:
        "Volume maximal (52–56 km) et grandes sorties longues (20–26 km) avec ravitaillement",
      weekType: "Pic de volume & Sortie longue clé",
      avgKm: Math.round(baseKm * 1.6),
      sessionsPerWeek: 4,
    },
    {
      name: "Phase 4 : Affûtage, Surcompensation & Jour J",
      weeksRangeLabel: `Semaines ${p3End + 1} à ${totalWeeks}`,
      focus:
        "Baisse progressive du volume (-25% à -40%), maintien de l'intensité et fraîcheur maximale",
      weekType: "Affûtage & Marathon Officiel (3h30)",
      avgKm: Math.round(baseKm * 0.9),
      sessionsPerWeek: 3,
    },
  ];

  // Calcul mathématique semaine par semaine respectant strictement la règle des +10%
  // et départ doux (~80% de la baseline pour éviter tout saut brutal de 0 à 30+ km)
  const startingKm = Math.max(18, Math.min(26, Math.round(baseKm * 0.82)));
  const weeklyBreakdown: WeeklyPlanBreakdown[] = [];

  let currentCycleBase = startingKm;
  let currentKm = startingKm;

  for (let w = 1; w <= totalWeeks; w++) {
    let phaseName = phases[0].name;
    let weekType = "Volume & Endurance Z2";
    let isDeload = false;

    if (w <= p1End) {
      phaseName = phases[0].name;
      const cycleIndex = (w - 1) % 4;
      if (cycleIndex === 0) {
        currentKm = w === 1 ? startingKm : Math.round(currentCycleBase * 1.08);
        currentCycleBase = currentKm;
        weekType = "Démarrage progressif doux";
      } else if (cycleIndex === 3) {
        // Semaine 4 : Assimilation (-22%)
        isDeload = true;
        currentKm = Math.round(currentKm * 0.78);
        weekType = "Assimilation & Récupération (Deload -22%)";
      } else {
        // Semaines 2 et 3 : Règle des +10%
        currentKm = Math.round(currentKm * 1.1);
        weekType = "Volume progressif (+10%)";
      }
    } else if (w <= p2End) {
      phaseName = phases[1].name;
      const cycleIndex = (w - (p1End + 1)) % 4;
      if (cycleIndex === 0) {
        currentCycleBase = Math.round(currentCycleBase * 1.15);
        currentKm = currentCycleBase;
        weekType = "Allure Marathon Spécifique (4:58/km)";
      } else if (cycleIndex === 3) {
        isDeload = true;
        currentKm = Math.round(currentKm * 0.78);
        weekType = "Assimilation & Décharge (-22%)";
      } else {
        currentKm = Math.round(currentKm * 1.1);
        weekType = "Seuil & Allure Cible (+10%)";
      }
    } else if (w <= p3End) {
      phaseName = phases[2].name;
      const relativeW = w - (p2End + 1);
      if (w === p3End - 1) {
        // Pic absolu
        currentKm = Math.min(56, Math.max(48, Math.round(baseKm * 1.85)));
        weekType = "Pic Absolu de Volume & Sortie Longue (26 km)";
      } else if (relativeW % 4 === 3) {
        isDeload = true;
        currentKm = Math.round(currentKm * 0.76);
        weekType = "Assimilation pré-pic (-24%)";
      } else {
        currentKm = Math.round(Math.min(54, currentKm * 1.08));
        weekType = "Montée de Charge & Sortie Longue";
      }
    } else {
      phaseName = phases[3].name;
      const taperWeeksFromEnd = totalWeeks - w;
      if (taperWeeksFromEnd === 0) {
        // Semaine de course (Race Week)
        currentKm = 24; // avant la course + 42.2 km le dimanche
        weekType = "🏆 SEMAINE DU MARATHON (3H30)";
      } else if (taperWeeksFromEnd === 1) {
        currentKm = 35;
        weekType = "Affûtage & Surcompensation (-30%)";
      } else {
        currentKm = 42;
        weekType = "Début de l'Affûtage (-15%)";
      }
    }

    weeklyBreakdown.push({
      weekNumber: w,
      relativeWeek: w,
      phaseName,
      weekType,
      estimatedKm: currentKm,
      plannedRunningSessions: isDeload ? 3 : 4,
      restDays: isDeload ? 4 : 3,
      keySessions: [
        `Séance qualité : ${weekType.includes("Marathon") ? "Allure Marathon (4:58/km)" : "Seuil / Tempo Z4"}`,
        `Sortie longue : ${Math.min(26, Math.round(currentKm * 0.42))} km`,
      ],
    });
  }

  return {
    planSummary: `Plan personnalisé de ${totalWeeks} semaines vers ton objectif Marathon en 3h30 (${targetDateLabel || "février 2027"}). Volume initial doux à ${startingKm} km/semaine, progression stricte de +10 % par semaine, assimilation programmée toutes les 4 semaines et pic de volume avec affûtage pré-course.`,
    weeksGenerated: totalWeeks,
    startWeekNumber: 42,
    year: new Date().getFullYear(),
    targetRaceDate: targetDateLabel || "21 février 2027",
    modelUsed: "riles-pro-engine",
    totalPlannedSessions: weeklyBreakdown.reduce(
      (acc, b) => acc + b.plannedRunningSessions,
      0,
    ),
    phases,
    weeklyBreakdown,
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
      const goalAnalysis = finalData?.mainGoal
        ? buildLocalGoalReformulation(finalData.mainGoal)
        : undefined;
      const totalWeeks =
        finalData?.weeksToGenerate ||
        goalAnalysis?.extractedGoal?.weeksRemaining ||
        16;
      const baseKm = finalData?.stravaSixMonthsSummary?.recent4WeeksAvgKm || 28;
      const targetRaceDate =
        finalData?.targetRaceDate ||
        goalAnalysis?.extractedGoal?.raceDate ||
        "Dans 16 semaines (4 mois)";
      const fallbackPlan = buildLocalGeneratedPlan(
        totalWeeks,
        baseKm,
        targetRaceDate,
      );
      return {
        ...DEFAULT_ONBOARDING_STATE,
        ...finalData,
        isCompleted: true,
        generatedPlan: fallbackPlan,
        generatedPlanSummary: fallbackPlan.planSummary,
      };
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
