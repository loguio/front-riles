export interface ChatMessage {
  id: string;
  sender: "user" | "coach" | "system";
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: "adjust_workout" | "reschedule" | "reduce_intensity";
    label: string;
    applied: boolean;
    workoutId?: string;
    details?: string;
  };
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
