import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  UserProfile,
  WorkoutSession,
  ChatMessage,
  ChatSuggestedAction,
  QuickPrompt,
  RpeCheckIn,
  CommunityRun,
  CommunityError,
  MonthlyChallenge,
  OnboardingState,
  CoachContext,
  ToggleRunAction,
} from "../types";
import {
  workoutService,
  chatService,
  onboardingService,
  userService,
  communityService,
} from "../services";
import {
  formatDateKey,
  getWeekNumber,
  getDaysOfWeek,
} from "../utils/dateUtils";
import { loadAppData, toUserFacingError } from "./appData";

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
  chatErrorMessage: string | null;
  communityRuns: CommunityRun[];
  challenges: MonthlyChallenge[];
  isCommunityLoading: boolean;
  communityError: CommunityError | null;
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
  resendLastChatMessage: () => Promise<void>;
  applyCoachAction: (
    actionDetails: string,
    dayNumber?: number,
    suggestedAction?: ChatSuggestedAction,
    messageId?: string,
  ) => Promise<void>;
  generateMultiWeekPlan: (weeksToGenerate?: number) => Promise<void>;
  toggleCommunityRun: (runId: string) => Promise<void>;
  refreshCommunity: () => Promise<void>;
  completeOnboarding: (
    data?: Partial<OnboardingState>,
  ) => Promise<OnboardingState | void>;
  resetOnboarding: () => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Inert placeholder for `loadAppData`'s monthly-challenge dependency: community
 * data is loaded independently (Phase 5B) and this field is ignored here.
 */
const INERT_CHALLENGE: MonthlyChallenge = {
  id: "",
  title: "",
  metric: "distance",
  target: 0,
  unit: "",
  progress: 0,
  progressRatio: 0,
  periodStart: "",
  periodEnd: "",
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const currentDay = today.getDate();
  const currentWeek = getWeekNumber(today);
  const todayDateKey = formatDateKey(currentYear, currentMonth, currentDay);

  const [isOnboardingCompleted, setIsOnboardingCompleted] =
    useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [monthWorkouts, setMonthWorkouts] = useState<
    Record<string, WorkoutSession>
  >({});
  const [selectedDay, setSelectedDayState] = useState<number>(currentDay);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayDateKey);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(
    null,
  );
  const [rpeCheckIn, setRpeCheckIn] = useState<RpeCheckIn | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
  const [isCoachTyping, setIsCoachTyping] = useState<boolean>(false);
  const [chatErrorMessage, setChatErrorMessage] = useState<string | null>(null);
  const pendingChatTextRef = useRef<string | null>(null);
  const [communityRuns, setCommunityRuns] = useState<CommunityRun[]>([]);
  const [challenges, setChallenges] = useState<MonthlyChallenge[]>([]);
  // Starts `true` so the first render shows the loading state instead of a
  // flash of the empty state while the community request is in flight.
  const [isCommunityLoading, setIsCommunityLoading] = useState<boolean>(true);
  const [communityError, setCommunityError] = useState<CommunityError | null>(
    null,
  );
  const [activeWeek, setActiveWeekState] = useState<number>(currentWeek);
  const [activeMonth, setActiveMonthState] = useState<number>(currentMonth);
  const [activeYear, setActiveYearState] = useState<number>(currentYear);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [multiWeekPlanSummary, setMultiWeekPlanSummary] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chargement des données communautaires (sorties + défis) via l'API réelle.
  // Ne rejette jamais : les erreurs sont capturées et exposées via communityError.
  const loadCommunityData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsCommunityLoading(true);
      }
      setCommunityError(null);

      const [runsResult, challengesResult] = await Promise.all([
        communityService.getCommunityRuns(),
        communityService.getMonthlyChallenges(),
      ]);

      if (runsResult.ok) {
        setCommunityRuns(runsResult.data);
      } else {
        setCommunityError(runsResult.error);
      }

      if (challengesResult.ok) {
        setChallenges(challengesResult.data);
      } else {
        // On privilégie l'erreur des sorties si les deux échouent.
        setCommunityError((prev) => prev ?? challengesResult.error);
      }

      if (!options?.silent) {
        setIsCommunityLoading(false);
      }
    },
    [],
  );

  // Chargement initial des données connectées au backend
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // Synchronisation incrémentale Strava : best-effort, explicite.
      // En cas d'échec on continue sans données Strava fraîches — aucune
      // donnée n'est fabriquée et l'erreur reste visible via console.
      try {
        await workoutService.syncRecentActivities(7);
      } catch (syncError) {
        console.warn("Strava incremental sync skipped:", syncError);
      }

      // Community is loaded independently (Phase 5B) so its loading / error
      // state stays scoped to the Running Club tab and the full challenges
      // array is preserved. `loadAppData` still declares the two community
      // dependencies (master's contract), so we hand it inert resolvers here
      // and ignore its community fields.
      const communityPromise = loadCommunityData();

      const data = await loadAppData(
        {
          getOnboardingState: () => onboardingService.getOnboardingState(),
          getProfile: () => userService.getProfile(),
          getWeekWorkouts: (week, year) =>
            workoutService.getWeekWorkouts(week, year),
          getMonthWorkouts: (month, year) =>
            workoutService.getMonthWorkouts(month, year),
          getChatHistory: () => chatService.getChatHistory(),
          getQuickPrompts: () => chatService.getQuickPrompts(),
          getCommunityRuns: async () => [],
          getMonthlyChallenge: async () => INERT_CHALLENGE,
        },
        { week: currentWeek, year: currentYear, month: currentMonth },
      );

      await communityPromise;

      setIsOnboardingCompleted(data.isOnboardingCompleted);
      setUser(data.user);
      setWorkouts(data.workouts);
      setMonthWorkouts(data.monthWorkouts);
      setChatMessages(data.chatMessages);
      setQuickPrompts(data.quickPrompts);

      // Sélection de la séance par défaut (séance du jour en priorité ou première de la semaine)
      const defaultSession =
        data.workouts.find((w) => w.dateKey === todayDateKey) ||
        data.workouts.find((w) => w.dayNumber === currentDay) ||
        data.workouts[0] ||
        null;

      setSelectedWorkout(defaultSession);
      if (defaultSession) {
        setSelectedDateKey(defaultSession.dateKey);
        setSelectedDayState(defaultSession.dayNumber);
      }
    } catch (err: any) {
      // RILES-015 : aucun repli silencieux, l'écran affiche l'erreur + retry.
      console.error("Failed to load initial app data from backend:", err);
      setErrorMessage(toUserFacingError(err));
    } finally {
      setIsLoading(false);
    }
  }, [
    currentWeek,
    currentYear,
    currentMonth,
    currentDay,
    todayDateKey,
    loadCommunityData,
  ]);

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
        const targetMonth =
          weekDays.length > 0 ? weekDays[0].month : activeMonth;
        if (weekDays.length > 0) {
          setActiveMonthState(targetMonth);
        }

        const [newWeekWorkouts, newMonthWorkouts] = await Promise.all([
          workoutService.getWeekWorkouts(week, year),
          workoutService.getMonthWorkouts(targetMonth, year),
        ]);
        setWorkouts(newWeekWorkouts);
        setMonthWorkouts(newMonthWorkouts);

        // Vérifie si le jour sélectionné est dans cette semaine
        const currentInWeek = newWeekWorkouts.find(
          (w) => w.dateKey === selectedDateKey,
        );

        if (currentInWeek) {
          setSelectedWorkout(currentInWeek);
        } else {
          const fallbackSession =
            newWeekWorkouts.find((w) => w.dateKey === todayDateKey) ||
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
        setErrorMessage(toUserFacingError(err));
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
        setErrorMessage(toUserFacingError(err));
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

      try {
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
      } catch (err) {
        // RILES-015 : sélection maintenue, mais l'erreur est affichée
        // (aucune séance fabriquée pour remplacer la réponse du serveur).
        console.error("Failed to select day:", err);
        setErrorMessage(toUserFacingError(err));
      }
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
      try {
        const result = await workoutService.submitRpeCheckIn(
          rating,
          selectedWorkout?.id,
        );
        setRpeCheckIn(result);
        setErrorMessage(null);
        return result;
      } catch (err) {
        // RILES-015 : pas de retour RPE fabriqué, l'erreur remonte.
        setErrorMessage(toUserFacingError(err));
        throw err;
      }
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
      setChatErrorMessage(null);

      try {
        const { coachReply } = await chatService.sendMessage(text, {
          activeSessionTitle: selectedWorkout?.title,
          dateKey: selectedDateKey,
          readinessScore: user?.readinessScore,
          lastRpe: rpeCheckIn?.rating,
          ...context,
        });
        setChatMessages((prev) => [...prev, coachReply]);
        pendingChatTextRef.current = null;

        // Si le coach IA a automatiquement reformulé et enregistré une règle de vie à l'envoi du message, on synchronise le profil localement avec anti-doublon
        if (
          coachReply.suggestedAction?.type === "add_life_rule" &&
          coachReply.suggestedAction.ruleData
        ) {
          const ruleData = coachReply.suggestedAction.ruleData;
          const cleanTitle = (ruleData.title || "").trim().toLowerCase();
          const cleanDesc = (ruleData.description || "").trim().toLowerCase();
          const alreadyExists = (user?.rules || []).some((r) => {
            const rTitle = (r.title || "").trim().toLowerCase();
            const rDesc = (r.description || "").trim().toLowerCase();
            return (
              rTitle === cleanTitle ||
              rDesc === cleanDesc ||
              (cleanTitle.length > 3 && rTitle.includes(cleanTitle)) ||
              (cleanDesc.length > 5 && rDesc.includes(cleanDesc))
            );
          });
          if (!alreadyExists) {
            const updatedRules = await userService.addRule(ruleData);
            setUser((prev) => (prev ? { ...prev, rules: updatedRules } : prev));
          }
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
        // RILES-015 : aucune réponse de coach fabriquée localement.
        // On retire le message optimiste (non confirmé par le serveur) et on
        // propose un renvoi explicite via le bandeau d'erreur du chat.
        console.error("Chat error:", err);
        setChatMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        pendingChatTextRef.current = text;
        setChatErrorMessage(toUserFacingError(err));
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

  // Renvoi du dernier message refusé par le serveur (bandeau d'erreur du chat)
  const resendLastChatMessage = useCallback(async () => {
    const pending = pendingChatTextRef.current;
    if (!pending) return;
    await sendChatMessage(pending);
  }, [sendChatMessage]);

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
        // RILES-015 : pas de plan local de secours, l'erreur s'affiche.
        console.error("Failed to generate multi-week plan:", err);
        setErrorMessage(toUserFacingError(err));
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

          const cleanTitle = (ruleToCreate.title || "").trim().toLowerCase();
          const cleanDesc = (ruleToCreate.description || "")
            .trim()
            .toLowerCase();
          const alreadyExists = (user?.rules || []).some((r) => {
            const rTitle = (r.title || "").trim().toLowerCase();
            const rDesc = (r.description || "").trim().toLowerCase();
            return (
              rTitle === cleanTitle ||
              rDesc === cleanDesc ||
              (cleanTitle.length > 3 && rTitle.includes(cleanTitle)) ||
              (cleanDesc.length > 5 && rDesc.includes(cleanDesc))
            );
          });
          if (!alreadyExists) {
            const updatedRules = await userService.addRule(ruleToCreate);
            setUser((prev) => (prev ? { ...prev, rules: updatedRules } : prev));
          }

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
        setErrorMessage(toUserFacingError(err));
      }
    },
    [selectedDay, selectedDateKey],
  );

  // Inscription / désinscription aux sorties communautaires via l'API réelle.
  // Met à jour l'UI de façon optimiste avant l'aller-retour serveur pour donner
  // un retour immédiat, puis réconcilie avec la réponse faisant autorité.
  const toggleCommunityRun = useCallback(
    async (runId: string) => {
      const current = communityRuns.find((run) => run.id === runId);
      if (!current) return;

      // Action explicite dérivée de l'état courant : contrat déterministe,
      // jamais de bascule implicite côté serveur.
      const action: ToggleRunAction = current.isJoined ? "leave" : "join";
      const previousIsJoined = current.isJoined;
      const previousCount = current.participantCount;
      const optimisticIsJoined = !current.isJoined;
      const optimisticCount = Math.max(
        0,
        current.participantCount + (optimisticIsJoined ? 1 : -1),
      );

      // 1. Application optimiste : l'UI réagit au tap avant tout réseau.
      setCommunityRuns((prev) =>
        prev.map((run) =>
          run.id === runId
            ? {
                ...run,
                isJoined: optimisticIsJoined,
                participantCount: optimisticCount,
              }
            : run,
        ),
      );

      const result = await communityService.toggleRunRegistration(
        runId,
        action,
      );

      if (!result.ok) {
        // 2. Échec : retour propre à l'état précédent + erreur exposée.
        setCommunityRuns((prev) =>
          prev.map((run) =>
            run.id === runId
              ? {
                  ...run,
                  isJoined: previousIsJoined,
                  participantCount: previousCount,
                }
              : run,
          ),
        );
        setCommunityError(result.error);
        return;
      }

      // 3. Réconciliation avec la réponse serveur.
      setCommunityRuns((prev) =>
        prev.map((run) =>
          run.id === runId
            ? {
                ...run,
                isJoined: result.data.isJoined,
                participantCount: result.data.participantCount,
              }
            : run,
        ),
      );

      // Puis rafraîchit depuis le serveur pour des données faisant autorité.
      await loadCommunityData({ silent: true });
    },
    [communityRuns, loadCommunityData],
  );

  // Finalisation de l'onboarding (avec génération automatique du plan multi-semaines côté backend)
  const completeOnboarding = useCallback(
    async (data?: Partial<OnboardingState>) => {
      try {
        const result = await onboardingService.completeOnboarding(data);
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
          refreshedWeek.find((w) => w.dateKey === todayDateKey) ||
          refreshedWeek.find((w) => w.dayNumber === currentDay) ||
          refreshedWeek[0] ||
          null;
        setSelectedWorkout(defaultSession);
        if (defaultSession) {
          setSelectedDateKey(defaultSession.dateKey);
          setSelectedDayState(defaultSession.dayNumber);
        }
        setErrorMessage(null);
        return result;
      } catch (err) {
        // RILES-015 : aucun plan généré localement en cas d'échec.
        console.error("Failed to complete onboarding:", err);
        setErrorMessage(toUserFacingError(err));
        throw err;
      }
    },
    [activeWeek, activeMonth, activeYear],
  );

  // Réinitialisation de l'onboarding (pour tests et démos)
  const resetOnboarding = useCallback(async () => {
    try {
      setIsOnboardingCompleted(false);
      setWorkouts([]);
      setMonthWorkouts({});
      setChatMessages([]);
      setSelectedWorkout(null);
      await onboardingService.resetOnboarding();
      await chatService.resetChat();
      setUser((prev) =>
        prev ? { ...prev, isOnboardingCompleted: false, rules: [] } : null,
      );
    } catch (err) {
      console.error("Failed to reset onboarding:", err);
      setErrorMessage(toUserFacingError(err));
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
        chatErrorMessage,
        communityRuns,
        challenges,
        isCommunityLoading,
        communityError,
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
        resendLastChatMessage,
        applyCoachAction,
        generateMultiWeekPlan,
        toggleCommunityRun,
        refreshCommunity: loadCommunityData,
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
