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
}
