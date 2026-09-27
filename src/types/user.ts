export interface UserRule {
  id: string;
  title: string;
  description: string;
  icon: string; // Icon name (MaterialCommunityIcons or Ionicons)
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  initials: string;
  readinessScore: number; // e.g. 88%
  activeGoal: {
    title: string;
    target: string;
    raceDate: string; // e.g. '17 mars 2025'
    weeksRemaining: number;
    progressPercentage: number;
  };
  stats: {
    activeWeeks: number;
    totalKm: number;
    completedRaces: number;
  };
  rules: UserRule[];
  connectedApps: string[];
  planType: "basic" | "pro";
}
