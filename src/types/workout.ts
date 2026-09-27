export type WorkoutStatus = "done" | "selected" | "rest" | "upcoming";

export interface EffortBlock {
  title: string;
  durationLabel: string;
  type: "warmup" | "threshold" | "cooldown" | "interval" | "recovery";
  flexRatio: number;
}

export interface WorkoutSession {
  id: string;
  dateKey: string; // YYYY-MM-DD
  dayName: string; // e.g. 'Mer'
  dayNumber: number; // e.g. 14
  fullDateLabel: string; // e.g. 'MERCREDI 14 OCTOBRE'
  timeLabel?: string; // e.g. "AUJOURD'HUI • 18:30"
  status: WorkoutStatus;
  isRestDay: boolean;
  category: string; // e.g. 'SÉANCE QUALITATIVE'
  title: string; // e.g. 'Sortie Seuil & Allure Cible'
  duration: string; // e.g. '1h15' or '45 min'
  distance: string; // e.g. '14 km' or '8,5 km'
  targetPace: string; // e.g. '4:50/km'
  targetZoneLabel: string; // e.g. 'Zone 3–4'
  targetZoneBpm: string; // e.g. '158–172 bpm'
  targetZoneSegments: {
    color: string;
    flex: number;
  }[];
  pinPositionPercent: number; // 0 to 100
  effortBlocks: EffortBlock[];
  tags?: string[];
  aiAdjustmentNote?: string;
}

export interface RpeCheckIn {
  rating: number; // 1-10
  feedbackLabel: string; // 'Très facile', 'Modéré', 'Difficile', 'À fond'
  submittedAt?: string;
  aiPreservationMessage: string;
}
