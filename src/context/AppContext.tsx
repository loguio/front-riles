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
  ChatSuggestedAction,
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
import { formatDateKey, getWeekNumber, getDaysOfWeek } from "../utils/dateUtils";

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
  isGeneratingPlan: boolean;
  multiWeekPlanSummary: string | null;
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
    suggestedAction?: ChatSuggestedAction,
    messageId?: string,
  ) => Promise<void>;
  generateMultiWeekPlan: (weeksToGenerate?: number) => Promise<void>;
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
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [multiWeekPlanSummary, setMultiWeekPlanSummary] = useState<
    string | null
  >(null);
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

  // Changement de semaine active avec chargement backend (sans génération à la volée)
  const setActiveWeek = useCallback(
    async (week: number, year = activeYear) => {
      try {
        setActiveWeekState(week);
        setActiveYearState(year);

        const weekDays = getDaysOfWeek(year, week);
        if (weekDays.length > 0) {
          setActiveMonthState(weekDays[0].month);
        }

        const newWeekWorkouts = await workoutService.getWeekWorkouts(
          week,
          year,
        );
        setWorkouts(newWeekWorkouts);

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
          } else {
            // Aucune séance prévue sur cette semaine : on sélectionne le lundi de la semaine et on met selectedWorkout à null
            if (weekDays.length > 0) {
              setSelectedDayState(weekDays[0].dayNumber);
              setSelectedDateKey(weekDays[0].dateKey);
            }
            setSelectedWorkout(null);
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

        // Si le coach IA a automatiquement reformulé et enregistré une règle de vie à l'envoi du message, on synchronise le profil localement
        if (
          coachReply.suggestedAction?.type === "add_life_rule" &&
          coachReply.suggestedAction.ruleData
        ) {
          const updatedRules = await userService.addRule(
            coachReply.suggestedAction.ruleData,
          );
          setUser((prev) => (prev ? { ...prev, rules: updatedRules } : prev));
        }

        // Si le coach IA a recalculé dynamiquement la séance ou la semaine complète suite au message de l'utilisateur,
        // on rafraîchit immédiatement les séances de la semaine et du mois !
        if (
          coachReply.suggestedAction?.applied &&
          coachReply.suggestedAction.type !== "add_life_rule"
        ) {
          const [refreshedWeek, refreshedMonth] = await Promise.all([
            workoutService.getWeekWorkouts(activeWeek, activeYear),
            workoutService.getMonthWorkouts(activeMonth, activeYear),
          ]);
          setWorkouts(refreshedWeek);
          setMonthWorkouts(refreshedMonth);
          const updatedSelected = refreshedWeek.find(
            (w) => w.dateKey === selectedDateKey,
          );
          if (updatedSelected) {
            setSelectedWorkout(updatedSelected);
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
      } finally {
        setIsCoachTyping(false);
      }
    },
    [
      selectedWorkout?.title,
      user?.readinessScore,
      rpeCheckIn?.rating,
      activeWeek,
      activeMonth,
      activeYear,
      selectedDateKey,
    ],
  );

  // Génération du plan multi-semaines via le meilleur LLM (LLM_PRO_MODEL)
  const generateMultiWeekPlan = useCallback(
    async (weeksToGenerate = 4) => {
      try {
        setIsGeneratingPlan(true);
        const result = await workoutService.generateMultiWeekPlan({
          startWeekNumber: activeWeek,
          year: activeYear,
          weeksToGenerate,
        });
        setMultiWeekPlanSummary(result.planSummary);

        const [refreshedWeek, refreshedMonth, refreshedChat] =
          await Promise.all([
            workoutService.getWeekWorkouts(activeWeek, activeYear),
            workoutService.getMonthWorkouts(activeMonth, activeYear),
            chatService.getChatHistory(),
          ]);

        setWorkouts(refreshedWeek);
        setMonthWorkouts(refreshedMonth);
        setChatMessages(refreshedChat);

        const updatedSelected = refreshedWeek.find(
          (w) => w.dateKey === selectedDateKey,
        );
        if (updatedSelected) {
          setSelectedWorkout(updatedSelected);
        }
      } catch (err) {
        console.error("Failed to generate multi-week plan:", err);
      } finally {
        setIsGeneratingPlan(false);
      }
    },
    [activeWeek, activeMonth, activeYear, selectedDateKey],
  );

  // Application d'une adaptation IA à la séance courante ou ajout d'une règle de vie depuis le chat
  const applyCoachAction = useCallback(
    async (
      actionDetails: string,
      dayNumber = selectedDay,
      suggestedAction?: ChatSuggestedAction,
      messageId?: string,
    ) => {
      try {
        // Cas 1 : Ajout d'une Règle de Vie directement depuis le Chat
        if (
          actionDetails === "add_life_rule" ||
          suggestedAction?.type === "add_life_rule"
        ) {
          const ruleToCreate = suggestedAction?.ruleData || {
            title: "Règle personnalisée",
            description: suggestedAction?.label || "Ajoutée via le Coach IA",
            icon: "calendar-lock",
          };

          const updatedRules = await userService.addRule(ruleToCreate);
          setUser((prev) => (prev ? { ...prev, rules: updatedRules } : prev));

          setChatMessages((prev) =>
            prev.map((msg) => {
              if (
                (messageId && msg.id === messageId) ||
                (msg.suggestedAction &&
                  msg.suggestedAction.type === "add_life_rule" &&
                  !msg.suggestedAction.applied)
              ) {
                return {
                  ...msg,
                  suggestedAction: msg.suggestedAction
                    ? {
                        ...msg.suggestedAction,
                        applied: true,
                        label: `✓ Règle « ${ruleToCreate.title} » ajoutée à ton profil`,
                      }
                    : undefined,
                };
              }
              return msg;
            }),
          );
          return;
        }

        // Cas 2 : Adaptation d'une séance d'entraînement
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
              (messageId && msg.id === messageId) ||
              (msg.suggestedAction &&
                msg.suggestedAction.details === actionDetails)
            ) {
              return {
                ...msg,
                suggestedAction: msg.suggestedAction
                  ? {
                      ...msg.suggestedAction,
                      applied: true,
                      label: "✓ Modification appliquée au calendrier",
                    }
                  : undefined,
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

  // Finalisation de l'onboarding (avec génération automatique du plan multi-semaines côté backend)
  const completeOnboarding = useCallback(
    async (data?: Partial<OnboardingState>) => {
      try {
        await onboardingService.completeOnboarding(data);
        setIsOnboardingCompleted(true);
        const [refreshedProfile, refreshedWeek, refreshedMonth, refreshedChat] =
          await Promise.all([
            userService.getProfile(),
            workoutService.getWeekWorkouts(activeWeek, activeYear),
            workoutService.getMonthWorkouts(activeMonth, activeYear),
            chatService.getChatHistory(),
          ]);
        setUser(refreshedProfile);
        setWorkouts(refreshedWeek);
        setMonthWorkouts(refreshedMonth);
        setChatMessages(refreshedChat);

        const defaultSession =
          refreshedWeek.find(
            (w) => w.dateKey === "2026-10-14" || w.dayNumber === 14,
          ) ||
          refreshedWeek[0] ||
          null;
        setSelectedWorkout(defaultSession);
        if (defaultSession) {
          setSelectedDateKey(defaultSession.dateKey);
          setSelectedDayState(defaultSession.dayNumber);
        }
      } catch (err) {
        console.error("Failed to complete onboarding:", err);
      }
    },
    [activeWeek, activeMonth, activeYear],
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
        isGeneratingPlan,
        multiWeekPlanSummary,
        errorMessage,
        setSelectedDay,
        setSelectedDateKey: setSelectedDateByKey,
        setActiveWeek,
        setActiveMonth,
        submitRpe,
        sendChatMessage,
        applyCoachAction,
        generateMultiWeekPlan,
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
