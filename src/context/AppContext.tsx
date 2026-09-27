import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  UserProfile,
  WorkoutSession,
  ChatMessage,
  QuickPrompt,
  RpeCheckIn,
  CommunityRun,
  MonthlyChallenge,
  OnboardingState,
  CoachContext,
} from "../types";
import {
  workoutService,
  chatService,
  onboardingService,
  userService,
  communityService,
} from "../services";
import { formatDateKey, getWeekNumber } from "../utils/dateUtils";

interface AppContextType {
  // State
  isOnboardingCompleted: boolean;
  user: UserProfile | null;
  workouts: WorkoutSession[];
  monthWorkouts: Record<string, WorkoutSession>;
  selectedDay: number;
  selectedDateKey: string;
  selectedWorkout: WorkoutSession | null;
  rpeCheckIn: RpeCheckIn | null;
  chatMessages: ChatMessage[];
  quickPrompts: QuickPrompt[];
  isCoachTyping: boolean;
  communityRuns: CommunityRun[];
  challenge: MonthlyChallenge | null;
  activeWeek: number;
  activeMonth: number; // 0-11
  activeYear: number;
  isLoading: boolean;
  errorMessage: string | null;

  // Actions
  setSelectedDay: (day: number, month?: number, year?: number) => Promise<void>;
  setSelectedDateKey: (dateKey: string) => Promise<void>;
  setActiveWeek: (week: number, year?: number) => Promise<void>;
  setActiveMonth: (month: number, year?: number) => Promise<void>;
  submitRpe: (rating: number) => Promise<RpeCheckIn>;
  sendChatMessage: (text: string, context?: CoachContext) => Promise<void>;
  applyCoachAction: (
    actionDetails: string,
    dayNumber?: number,
  ) => Promise<void>;
  toggleCommunityRun: (runId: string) => Promise<void>;
  completeOnboarding: (data?: Partial<OnboardingState>) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] =
    useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [monthWorkouts, setMonthWorkouts] = useState<
    Record<string, WorkoutSession>
  >({});
  const [selectedDay, setSelectedDayState] = useState<number>(14);
  const [selectedDateKey, setSelectedDateKey] = useState<string>("2026-10-14");
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(
    null,
  );
  const [rpeCheckIn, setRpeCheckIn] = useState<RpeCheckIn | null>({
    rating: 5,
    feedbackLabel: "Modéré",
    aiPreservationMessage:
      "L'IA a ajusté le seuil pour préserver tes mollets aujourd'hui.",
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
  const [isCoachTyping, setIsCoachTyping] = useState<boolean>(false);
  const [communityRuns, setCommunityRuns] = useState<CommunityRun[]>([]);
  const [challenge, setChallenge] = useState<MonthlyChallenge | null>(null);
  const [activeWeek, setActiveWeekState] = useState<number>(42);
  const [activeMonth, setActiveMonthState] = useState<number>(9); // Octobre (index 9)
  const [activeYear, setActiveYearState] = useState<number>(2026);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chargement initial des données connectées au backend
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

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
        onboardingService.getOnboardingState(),
        userService.getProfile(),
        workoutService.getWeekWorkouts(42, 2026),
        workoutService.getMonthWorkouts(9, 2026),
        chatService.getChatHistory(),
        chatService.getQuickPrompts(),
        communityService.getCommunityRuns(),
        communityService.getMonthlyChallenge(),
      ]);

      setIsOnboardingCompleted(onboardingState.isCompleted);
      setUser(profile);
      setWorkouts(weekWorkouts);
      setMonthWorkouts(monthData);
      setChatMessages(messages);
      setQuickPrompts(prompts);
      setCommunityRuns(runs);
      setChallenge(monthChallenge);

      // Sélection de la séance par défaut (Mercredi 14 Octobre de la semaine 42)
      const defaultSession =
        weekWorkouts.find(
          (w) => w.dateKey === "2026-10-14" || w.dayNumber === 14,
        ) ||
        weekWorkouts[0] ||
        null;

      setSelectedWorkout(defaultSession);
      if (defaultSession) {
        setSelectedDateKey(defaultSession.dateKey);
        setSelectedDayState(defaultSession.dayNumber);
      }
    } catch (err: any) {
      console.error("Failed to load initial app data from backend:", err);
      setErrorMessage(err.message || "Erreur de chargement des données");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Changement de semaine active avec chargement backend
  const setActiveWeek = useCallback(
    async (week: number, year = activeYear) => {
      try {
        setActiveWeekState(week);
        setActiveYearState(year);

        const newWeekWorkouts = await workoutService.getWeekWorkouts(
          week,
          year,
        );
        setWorkouts(newWeekWorkouts);

        // Synchronise le mois avec le 1er jour de la semaine
        if (newWeekWorkouts.length > 0) {
          const firstDay = newWeekWorkouts[0];
          const parts = firstDay.dateKey.split("-");
          const monthIndex = parseInt(parts[1], 10) - 1;
          setActiveMonthState(monthIndex);
        }

        // Vérifie si le jour sélectionné est dans cette semaine
        const currentInWeek = newWeekWorkouts.find(
          (w) => w.dateKey === selectedDateKey,
        );

        if (currentInWeek) {
          setSelectedWorkout(currentInWeek);
        } else {
          const fallbackSession =
            newWeekWorkouts.find((w) => w.dayNumber === 14 && week === 42) ||
            newWeekWorkouts[0] ||
            null;

          if (fallbackSession) {
            setSelectedDayState(fallbackSession.dayNumber);
            setSelectedDateKey(fallbackSession.dateKey);
            setSelectedWorkout(fallbackSession);
          }
        }
      } catch (err) {
        console.error("Failed to set active week:", err);
      }
    },
    [activeYear, selectedDateKey],
  );

  // Changement de mois actif avec chargement backend
  const setActiveMonth = useCallback(
    async (month: number, year = activeYear) => {
      try {
        setActiveMonthState(month);
        setActiveYearState(year);

        const monthData = await workoutService.getMonthWorkouts(month, year);
        setMonthWorkouts(monthData);
      } catch (err) {
        console.error("Failed to set active month:", err);
      }
    },
    [activeYear],
  );

  // Sélection d'un jour spécifique
  const setSelectedDay = useCallback(
    async (day: number, month = activeMonth, year = activeYear) => {
      const targetDateKey = formatDateKey(year, month, day);
      const targetDate = new Date(year, month, day);
      const targetWeek = getWeekNumber(targetDate);

      setSelectedDayState(day);
      setSelectedDateKey(targetDateKey);

      let currentWorkouts = workouts;

      if (targetWeek !== activeWeek) {
        setActiveWeekState(targetWeek);
        currentWorkouts = await workoutService.getWeekWorkouts(
          targetWeek,
          year,
        );
        setWorkouts(currentWorkouts);
      }

      if (month !== activeMonth) {
        setActiveMonthState(month);
        const monthData = await workoutService.getMonthWorkouts(month, year);
        setMonthWorkouts(monthData);
      }

      const session =
        currentWorkouts.find((w) => w.dateKey === targetDateKey) ||
        (await workoutService.getWorkoutByDateKey(targetDateKey)) ||
        null;

      setSelectedWorkout(session);
    },
    [activeMonth, activeYear, activeWeek, workouts],
  );

  // Sélection par clé de date YYYY-MM-DD
  const setSelectedDateByKey = useCallback(
    async (dateKey: string) => {
      const [y, m, d] = dateKey.split("-").map(Number);
      await setSelectedDay(d, m - 1, y);
    },
    [setSelectedDay],
  );

  // Soumission de la note RPE au backend
  const submitRpe = useCallback(
    async (rating: number): Promise<RpeCheckIn> => {
      const result = await workoutService.submitRpeCheckIn(
        rating,
        selectedWorkout?.id,
      );
      setRpeCheckIn(result);
      return result;
    },
    [selectedWorkout?.id],
  );

  // Envoi d'un message au Coach IA avec réponse temps réel
  const sendChatMessage = useCallback(
    async (text: string, context?: CoachContext) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      const tempUserMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text,
        timestamp: timeStr,
      };

      setChatMessages((prev) => [...prev, tempUserMsg]);
      setIsCoachTyping(true);

      try {
        const { coachReply } = await chatService.sendMessage(text, {
          activeSessionTitle: selectedWorkout?.title,
          readinessScore: user?.readinessScore,
          lastRpe: rpeCheckIn?.rating,
          ...context,
        });
        setChatMessages((prev) => [...prev, coachReply]);
      } catch (err) {
        console.error("Chat error:", err);
      } finally {
        setIsCoachTyping(false);
      }
    },
    [selectedWorkout?.title, user?.readinessScore, rpeCheckIn?.rating],
  );

  // Application d'une adaptation IA à la séance courante
  const applyCoachAction = useCallback(
    async (actionDetails: string, dayNumber = selectedDay) => {
      try {
        const identifier = selectedDateKey || String(dayNumber);
        const updated = await workoutService.adaptSessionWithAI(
          identifier,
          actionDetails as any,
        );

        setWorkouts((prev) =>
          prev.map((w) =>
            w.dateKey === updated.dateKey || w.dayNumber === dayNumber
              ? updated
              : w,
          ),
        );

        setMonthWorkouts((prev) => ({
          ...prev,
          [updated.dateKey]: updated,
        }));

        setSelectedWorkout(updated);

        // Met à jour le chat pour afficher que l'action est appliquée
        setChatMessages((prev) =>
          prev.map((msg) => {
            if (
              msg.suggestedAction &&
              msg.suggestedAction.details === actionDetails
            ) {
              return {
                ...msg,
                suggestedAction: {
                  ...msg.suggestedAction,
                  applied: true,
                  label: "✓ Modification appliquée au calendrier",
                },
              };
            }
            return msg;
          }),
        );
      } catch (err) {
        console.error("Failed to apply coach action:", err);
      }
    },
    [selectedDay, selectedDateKey],
  );

  // Inscription / désinscription aux sorties communautaires
  const toggleCommunityRun = useCallback(async (runId: string) => {
    try {
      const updatedRun = await communityService.toggleRunRegistration(runId);
      setCommunityRuns((prev) =>
        prev.map((r) => (r.id === runId ? updatedRun : r)),
      );
    } catch (err) {
      console.error("Failed to toggle run RSVP:", err);
    }
  }, []);

  // Finalisation de l'onboarding
  const completeOnboarding = useCallback(
    async (data?: Partial<OnboardingState>) => {
      try {
        await onboardingService.completeOnboarding(data);
        setIsOnboardingCompleted(true);
        if (data?.mainGoal && user) {
          const updatedUser = await userService.updateProfile({
            activeGoal: {
              ...user.activeGoal,
              target: data.mainGoal,
            },
          });
          setUser(updatedUser);
        }
      } catch (err) {
        console.error("Failed to complete onboarding:", err);
      }
    },
    [user],
  );

  // Réinitialisation de l'onboarding (pour tests et démos)
  const resetOnboarding = useCallback(async () => {
    try {
      setIsOnboardingCompleted(false);
      await onboardingService.resetOnboarding();
      await chatService.resetChat();
      setUser((prev) =>
        prev ? { ...prev, isOnboardingCompleted: false } : null,
      );
    } catch (err) {
      console.error("Failed to reset onboarding:", err);
      setIsOnboardingCompleted(false);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        isOnboardingCompleted,
        user,
        workouts,
        monthWorkouts,
        selectedDay,
        selectedDateKey,
        selectedWorkout,
        rpeCheckIn,
        chatMessages,
        quickPrompts,
        isCoachTyping,
        communityRuns,
        challenge,
        activeWeek,
        activeMonth,
        activeYear,
        isLoading,
        errorMessage,
        setSelectedDay,
        setSelectedDateKey: setSelectedDateByKey,
        setActiveWeek,
        setActiveMonth,
        submitRpe,
        sendChatMessage,
        applyCoachAction,
        toggleCommunityRun,
        completeOnboarding,
        resetOnboarding,
        refreshAllData: loadData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
