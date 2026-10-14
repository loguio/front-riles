import { WorkoutSession, RpeCheckIn, MultiWeekPlanResponse } from "../types";
import { apiClient, ApiError } from "./apiClient";
import { formatDateKey } from "../utils/dateUtils";

/**
 * RILES-015 : aucune génération locale de plan, aucun feedback RPE fabriqué.
 * Chaque appel échoue explicitement (throw) quand le backend NestJS est
 * indisponible — l'écran affiche alors un état d'erreur avec « Réessayer ».
 */
export const workoutService = {
  /**
   * Génère le plan multi-semaines via le backend (LLM_PRO_MODEL)
   */
  async generateMultiWeekPlan(params?: {
    startWeekNumber?: number;
    year?: number;
    weeksToGenerate?: number;
  }): Promise<MultiWeekPlanResponse> {
    const startWeekNumber = params?.startWeekNumber ?? 42;
    const year = params?.year ?? 2026;
    const weeksToGenerate = params?.weeksToGenerate ?? 4;

    return apiClient.post<MultiWeekPlanResponse>("workouts/generate-plan", {
      startWeekNumber,
      year,
      weeksToGenerate,
    });
  },

  /**
   * Récupère les séances d'une semaine spécifique depuis l'API NestJS.
   * Un échec ne renvoie jamais un tableau vide : il est signalé.
   */
  async getWeekWorkouts(
    weekNumber = 42,
    year = 2026,
  ): Promise<WorkoutSession[]> {
    const data = await apiClient.get<WorkoutSession[]>("workouts/week", {
      params: { week: weekNumber, year },
    });
    if (!Array.isArray(data)) {
      throw new ApiError(
        `Réponse invalide pour les séances de la semaine ${weekNumber}`,
        502,
      );
    }
    return data;
  },

  /**
   * Récupère toutes les séances du mois sous forme de Record<dateKey, WorkoutSession>
   */
  async getMonthWorkouts(
    month = 9,
    year = 2026,
  ): Promise<Record<string, WorkoutSession>> {
    const data = await apiClient.get<Record<string, WorkoutSession>>(
      "workouts/month",
      {
        params: { month, year },
      },
    );
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new ApiError(`Réponse invalide pour le mois ${month}`, 502);
    }
    return data;
  },

  /**
   * Récupère le détail d'une séance par sa dateKey (YYYY-MM-DD).
   * 404 => aucun séance prévue (état vide) ; tout autre échec est signalé.
   */
  async getWorkoutByDateKey(dateKey: string): Promise<WorkoutSession | null> {
    try {
      const res = await apiClient.get<WorkoutSession>(`workouts/${dateKey}`);
      return res ?? null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Récupère une séance par son numéro de jour (compatibilité)
   */
  async getWorkoutByDay(
    dayNumber: number,
    month = 9,
    year = 2026,
  ): Promise<WorkoutSession | null> {
    const dateKey = formatDateKey(year, month, dayNumber);
    return this.getWorkoutByDateKey(dateKey);
  },

  /**
   * Met à jour une séance d'entraînement
   */
  async updateWorkout(
    identifier: string | number,
    updates: Partial<WorkoutSession>,
  ): Promise<WorkoutSession> {
    return apiClient.patch<WorkoutSession>(`workouts/${identifier}`, updates);
  },

  /**
   * Soumet une note d'effort RPE (1-10) et reçoit le feedback du backend.
   * Plus aucun retour d'« IA » fabriqué localement.
   */
  async submitRpeCheckIn(
    rating: number,
    workoutId?: string,
  ): Promise<RpeCheckIn> {
    return apiClient.post<RpeCheckIn>("workouts/rpe", {
      rating,
      workoutId,
    });
  },

  /**
   * Adapte une séance avec une recommandation du backend
   */
  async adaptSessionWithAI(
    identifier: string | number,
    adaptationType: "lighten" | "postpone" | "easy_run" | "injury_care",
  ): Promise<WorkoutSession> {
    return apiClient.post<WorkoutSession>(`workouts/${identifier}/adapt`, {
      adaptationType,
    });
  },

  /**
   * Synchronisation incrémentale à la demande des activités récentes Strava.
   * Échec => throw (appelant : traitement explicite, aucune donnée fabriquée).
   */
  async syncRecentActivities(daysLookback = 7): Promise<any> {
    return apiClient.post("webhooks/strava/sync-recent", {
      daysLookback,
    });
  },

  /**
   * Récupère la roadmap complète en temps réel du plan de préparation
   */
  async getPlanRoadmap(): Promise<any> {
    return apiClient.get("workouts/roadmap");
  },
};
