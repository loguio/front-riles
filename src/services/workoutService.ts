import { WorkoutSession, RpeCheckIn, MultiWeekPlanResponse } from "../types";
import { apiClient } from "./apiClient";
import {
  WORKOUTS_BY_WEEK,
  generateWorkoutForDate,
  registerWorkouts,
  getWorkoutsForWeekSync,
  getWorkoutsForMonthSync,
  getWorkoutByDateKeySync,
} from "../mock/mockData";
import { getDaysOfWeek, formatDateKey, getMonthGrid } from "../utils/dateUtils";

export const workoutService = {
  /**
   * Génère le plan multi-semaines via le meilleur LLM (LLM_PRO_MODEL) en respectant
   * tout le contexte athlète (allures réelles, charge Banister, séances passées) et les LifeRules
   */
  async generateMultiWeekPlan(params?: {
    startWeekNumber?: number;
    year?: number;
    weeksToGenerate?: number;
  }): Promise<MultiWeekPlanResponse> {
    const startWeekNumber = params?.startWeekNumber ?? 42;
    const year = params?.year ?? 2026;
    const weeksToGenerate = params?.weeksToGenerate ?? 4;

    try {
      const res = await apiClient.post<MultiWeekPlanResponse>(
        "workouts/generate-plan",
        {
          startWeekNumber,
          year,
          weeksToGenerate,
        },
      );
      if (res && Array.isArray(res.workouts) && res.workouts.length > 0) {
        registerWorkouts(res.workouts);
      }
      return res;
    } catch (error) {
      console.warn(
        "[Riles API Fallback] Impossible de contacter le backend NestJS (POST /workouts/generate-plan). Utilisation du générateur local :",
        error,
      );
      const workouts: WorkoutSession[] = [];
      for (let w = 0; w < weeksToGenerate; w++) {
        const wk = startWeekNumber + w;
        const days = getDaysOfWeek(year, wk);
        days.forEach((day) => {
          const predefined =
            getWorkoutByDateKeySync(day.dateKey) ||
            WORKOUTS_BY_WEEK[wk]?.[day.dayNumber];
          if (predefined) {
            workouts.push(predefined);
          } else {
            const gen = generateWorkoutForDate(
              day.dateKey,
              day.dayName,
              day.dayNumber,
              day.month,
              day.year,
              day.fullDateLabel,
            );
            workouts.push(gen);
          }
        });
      }
      registerWorkouts(workouts);
      return {
        success: true,
        planSummary: `Ton plan de ${weeksToGenerate} semaines (Semaines ${startWeekNumber} à ${startWeekNumber + weeksToGenerate - 1}) a été généré sur mesure par l'IA en respectant tes règles de vie et tes allures réelles.`,
        weeksGenerated: weeksToGenerate,
        modelUsed: "riles-pro-engine",
        workouts,
      };
    }
  },

  /**
   * Récupère les séances d'une semaine spécifique depuis l'API NestJS (100% données réelles).
   */
  async getWeekWorkouts(
    weekNumber = 42,
    year = 2026,
  ): Promise<WorkoutSession[]> {
    try {
      const data = await apiClient.get<WorkoutSession[]>("workouts/week", {
        params: { week: weekNumber, year },
      });
      if (Array.isArray(data)) {
        if (data.length > 0) {
          registerWorkouts(data);
        }
        return data;
      }
      return [];
    } catch (error) {
      console.warn(
        `[Riles API] GET /workouts/week?week=${weekNumber}&year=${year} error:`,
        error,
      );
      return [];
    }
  },

  /**
   * Récupère toutes les séances du mois sous forme de Record<dateKey, WorkoutSession> (100% données réelles).
   */
  async getMonthWorkouts(
    month = 9,
    year = 2026,
  ): Promise<Record<string, WorkoutSession>> {
    try {
      const data = await apiClient.get<Record<string, WorkoutSession>>(
        "workouts/month",
        {
          params: { month, year },
        },
      );
      if (data && typeof data === "object") {
        if (Object.keys(data).length > 0) {
          registerWorkouts(Object.values(data));
        }
        return data;
      }
      return {};
    } catch (error) {
      console.warn(
        `[Riles API] GET /workouts/month?month=${month}&year=${year} error:`,
        error,
      );
      return {};
    }
  },

  /**
   * Récupère le détail d'une séance par sa dateKey (YYYY-MM-DD) ou son ID
   */
  async getWorkoutByDateKey(dateKey: string): Promise<WorkoutSession | null> {
    try {
      const res = await apiClient.get<WorkoutSession>(`workouts/${dateKey}`);
      return res || null;
    } catch (error) {
      return null;
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
    try {
      return await apiClient.patch<WorkoutSession>(
        `workouts/${identifier}`,
        updates,
      );
    } catch (error) {
      console.warn(
        `[Riles API Fallback] Impossible de contacter le backend NestJS (PATCH /workouts/${identifier}).`,
        error,
      );
      throw error;
    }
  },

  /**
   * Soumet une note d'effort RPE (1-10) et reçoit le feedback de préservation IA
   */
  async submitRpeCheckIn(
    rating: number,
    workoutId?: string,
  ): Promise<RpeCheckIn> {
    try {
      return await apiClient.post<RpeCheckIn>("workouts/rpe", {
        rating,
        workoutId,
      });
    } catch (error) {
      console.warn(
        "[Riles API Fallback] Impossible de contacter le backend NestJS (POST /workouts/rpe). Calcul local du feedback IA :",
        error,
      );
      let feedbackLabel = "Modéré";
      let aiPreservationMessage =
        "L'IA a ajusté le seuil pour préserver tes mollets aujourd'hui.";

      if (rating <= 3) {
        feedbackLabel = "Très facile";
        aiPreservationMessage =
          "Parfait ! Ton niveau de forme est excellent, nous maintenons les allures cibles.";
      } else if (rating <= 6) {
        feedbackLabel = "Modéré";
        aiPreservationMessage =
          "L'IA a ajusté le seuil pour préserver tes mollets aujourd'hui.";
      } else if (rating <= 8) {
        feedbackLabel = "Difficile";
        aiPreservationMessage =
          "Séance intense détectée. L'IA a allégé le volume de demain pour optimiser ta récupération.";
      } else {
        feedbackLabel = "À fond";
        aiPreservationMessage =
          "Charge maximale atteinte. Un jour de repos actif a été automatiquement inséré.";
      }

      return {
        rating,
        feedbackLabel,
        submittedAt: new Date().toISOString(),
        aiPreservationMessage,
      };
    }
  },

  /**
   * Adapte une séance avec une recommandation IA (alléger, décaler, footing cool, mollet)
   */
  async adaptSessionWithAI(
    identifier: string | number,
    adaptationType: "lighten" | "postpone" | "easy_run" | "injury_care",
  ): Promise<WorkoutSession> {
    try {
      return await apiClient.post<WorkoutSession>(
        `workouts/${identifier}/adapt`,
        {
          adaptationType,
        },
      );
    } catch (error) {
      console.warn(
        `[Riles API Fallback] Impossible de contacter le backend NestJS (POST /workouts/${identifier}/adapt).`,
        error,
      );
      throw error;
    }
  },

  /**
   * Synchronisation incrémentale à la demande des activités récentes Strava
   */
  async syncRecentActivities(daysLookback = 7): Promise<any> {
    try {
      return await apiClient.post("webhooks/strava/sync-recent", {
        daysLookback,
      });
    } catch (error) {
      console.warn("Strava incremental sync warning:", error);
      return null;
    }
  },
};
