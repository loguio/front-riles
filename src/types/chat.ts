export interface SuggestedActionRuleData {
  title: string;
  description: string;
  icon: string;
}

export interface ChatSuggestedAction {
  type:
    | "adjust_workout"
    | "reschedule"
    | "reduce_intensity"
    | "add_life_rule";
  label: string;
  applied: boolean;
  workoutId?: string;
  details?: string;
  ruleData?: SuggestedActionRuleData;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "coach" | "system";
  text: string;
  timestamp: string;
  suggestedAction?: ChatSuggestedAction;
}

export interface QuickPrompt {
  id: string;
  label: string;
  message: string;
}

export interface CoachContext {
  activeSessionTitle?: string;
  readinessScore?: number;
  lastRpe?: number;
}
