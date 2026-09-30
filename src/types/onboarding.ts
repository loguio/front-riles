export type AuthProvider = "apple" | "google" | "email";

export type SportType = "running" | "swimming" | "cycling";

export interface ConnectedApp {
  id: string;
  name: string;
  code: string;
  color: string;
  isConnected: boolean;
}

export interface ExtractedRuleItem {
  title: string;
  description: string;
  icon: string;
}

export interface GoalReformulationResult {
  reformulatedGoal: string;
  extractedGoal: {
    title: string;
    target: string;
    raceDate: string;
    weeksRemaining: number;
    distanceKm?: number;
  };
  extractedRules: ExtractedRuleItem[];
  targetPaces: {
    easyPaceZ2: string;
    marathonPaceZ3: string;
    thresholdPaceZ4: string;
    intervalPaceZ5: string;
    targetRacePace: string;
  };
  eligibility: {
    status: "ELIGIBLE" | "WARNING" | "UNREALISTIC_DANGEROUS";
    isRealistic: boolean;
    pedagogicalMessage: string;
    suggestedAlternative?: string;
  };
}

export interface StravaMonthlyStat {
  monthKey: string;
  monthLabel?: string;
  label?: string;
  totalKm: number;
  sessionsCount: number;
  avgPace: string;
}

export interface StravaSixMonthsSummary {
  periodMonths?: number;
  startDateKey?: string;
  endDateKey?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  totalActivities?: number;
  totalSessions?: number;
  totalDistanceKm?: number;
  totalKm?: number;
  totalDurationHours?: number;
  totalElevationGainM?: number;
  activeWeeks: number;
  averageWeeklyKm?: number;
  avgWeeklyKm?: number;
  recent4WeeksAvgKm: number;
  longestRunKm: number;
  avgHeartRate: number;
  maxHeartRateObserved?: number;
  ctlFitness?: number;
  atlFatigue?: number;
  tsbForm?: number;
  estimatedPaces: {
    easyPaceZ2?: string;
    marathonPaceZ3?: string;
    thresholdPaceZ4?: string;
    intervalPaceZ5?: string;
    targetRacePace?: string;
    easyPaceRange?: string;
    thresholdPace?: string;
    intervalPace?: string;
  };
  banisterLoad?: {
    ctlFitness: number;
    atlFatigue: number;
    tsbForm: number;
    readinessScore: number;
  };
  monthlyBreakdown: StravaMonthlyStat[];
  ahaInsight: string;
  syncedAt?: string;
  sourceMode?: "strava_oauth_live" | "strava_history_import";
}

export interface OnboardingState {
  currentStep: number; // 1 to 5
  authMethod: AuthProvider | null;
  userEmail?: string;
  mainGoal: string;
  selectedSports: SportType[];
  connectedApps: string[];
  selectedPlan: "basic" | "pro";
  isCompleted: boolean;
  extractedRules?: ExtractedRuleItem[];
  stravaSixMonthsSummary?: StravaSixMonthsSummary;
  generatedPlanSummary?: string;
}
