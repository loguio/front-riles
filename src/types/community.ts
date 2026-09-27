export interface CommunityRun {
  id: string;
  tag: string;
  location: string;
  title: string;
  description: string;
  dateLabel: string;
  timeLabel: string;
  attendeesCount: number;
  isUserRegistered: boolean;
  category: string;
  pace: string;
  distance: string;
}

export interface MonthlyChallenge {
  id: string;
  badge: string;
  title: string;
  description: string;
  currentKm: number;
  targetKm: number;
}
