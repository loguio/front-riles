export type AuthProvider = "apple" | "google" | "email";

export type SportType = "running" | "swimming" | "cycling";

export interface ConnectedApp {
  id: string;
  name: string;
  code: string;
  color: string;
  isConnected: boolean;
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
}
