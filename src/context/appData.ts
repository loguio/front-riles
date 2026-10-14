import type {
  ChatMessage,
  CommunityRun,
  MonthlyChallenge,
  OnboardingState,
  QuickPrompt,
  UserProfile,
  WorkoutSession,
} from "../types";

/**
 * Chargement initial des données de l'application (RILES-015).
 *
 * Fonction pure et injectable : aucun import de service ni de fixture, ce qui
 * permet de vérifier en test que
 *  - un appel en échec REJETTE (l'état « erreur » s'affiche, aucune donnée
 *    mock n'est substituée) ;
 *  - un historique de chat réellement vide reste vide.
 */
export interface AppDataDependencies {
  getOnboardingState: () => Promise<OnboardingState>;
  getProfile: () => Promise<UserProfile>;
  getWeekWorkouts: (
    weekNumber: number,
    year: number,
  ) => Promise<WorkoutSession[]>;
  getMonthWorkouts: (
    month: number,
    year: number,
  ) => Promise<Record<string, WorkoutSession>>;
  getChatHistory: () => Promise<ChatMessage[]>;
  getQuickPrompts: () => Promise<QuickPrompt[]>;
  getCommunityRuns: () => Promise<CommunityRun[]>;
  getMonthlyChallenge: () => Promise<MonthlyChallenge>;
}

export interface AppData {
  isOnboardingCompleted: boolean;
  user: UserProfile;
  workouts: WorkoutSession[];
  monthWorkouts: Record<string, WorkoutSession>;
  chatMessages: ChatMessage[];
  quickPrompts: QuickPrompt[];
  communityRuns: CommunityRun[];
  challenge: MonthlyChallenge;
}

export interface AppDataParams {
  week: number;
  year: number;
  month: number;
}

/**
 * Charge l'ensemble des données initiales. Toute erreur est propagée :
 * l'appelant bascule en état d'erreur avec bouton « Réessayer ».
 */
export async function loadAppData(
  deps: AppDataDependencies,
  params: AppDataParams,
): Promise<AppData> {
  const [
    onboardingState,
    profile,
    weekWorkouts,
    monthData,
    messages,
    prompts,
    runs,
    monthChallenge,
  ] = await Promise.all([
    deps.getOnboardingState(),
    deps.getProfile(),
    deps.getWeekWorkouts(params.week, params.year),
    deps.getMonthWorkouts(params.month, params.year),
    deps.getChatHistory(),
    deps.getQuickPrompts(),
    deps.getCommunityRuns(),
    deps.getMonthlyChallenge(),
  ]);

  return {
    isOnboardingCompleted: onboardingState.isCompleted,
    user: profile,
    workouts: weekWorkouts,
    monthWorkouts: monthData,
    chatMessages: messages,
    quickPrompts: prompts,
    communityRuns: runs,
    challenge: monthChallenge,
  };
}

/** Traduit une erreur de service en message affichable (état d'erreur). */
export function toUserFacingError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Impossible de contacter le serveur. Vérifie ta connexion puis réessaie.";
}
