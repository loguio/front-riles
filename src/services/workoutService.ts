import { WorkoutSession, RpeCheckIn } from "../types";
import { apiClient } from "./apiClient";
import { WORKOUTS_BY_WEEK, generateWorkoutForDate } from "../mock/mockData";
import { getDaysOfWeek, formatDateKey, getMonthGrid } from "../utils/dateUtils";

export const workoutService = {
  /**
   * Récupère les 7 séances d'une semaine spécifique depuis l'API NestJS
   */
  async getWeekWorkouts(
    weekNumber = 42,
    year = 2026,
  ): Promise<WorkoutSession[]> {
    try {
      const data = await apiClient.get<WorkoutSession[]>("workouts/week", {
        params: { week: weekNumber, year },
      });
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      throw new Error("Empty week workouts from API");
    } catch (error) {
      console.warn(
        `API workoutService.getWeekWorkouts(${weekNumber}, ${year}) fallback:`,
        error,
      );
      const days = getDaysOfWeek(year, weekNumber);
      return days.map((day) => {
        const predefined = WORKOUTS_BY_WEEK[weekNumber]?.[day.dayNumber];
        if (predefined) return predefined;
        return generateWorkoutForDate(
          day.dateKey,
          day.dayName,
          day.dayNumber,
          day.month,
          day.year,
          day.fullDateLabel,
        );
      });
    }
  },

  /**
   * Récupère toutes les séances du mois sous forme de Record<dateKey, WorkoutSession>
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
      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        return data;
      }
      throw new Error("Empty month workouts from API");
    } catch (error) {
      console.warn(
        `API workoutService.getMonthWorkouts(${month}, ${year}) fallback:`,
        error,
      );
      const grid = getMonthGrid(year, month);
      const result: Record<string, WorkoutSession> = {};
      grid.days.forEach((dayCell) => {
        const predefined =
          WORKOUTS_BY_WEEK[dayCell.weekNumber]?.[dayCell.dayNumber];
        if (predefined) {
          result[dayCell.dateKey] = predefined;
        } else {
          result[dayCell.dateKey] = generateWorkoutForDate(
            dayCell.dateKey,
            "Mer",
            dayCell.dayNumber,
            month,
            year,
            `JOUR ${dayCell.dayNumber}`,
          );
        }
      });
      return result;
    }
  },

  /**
   * Récupère le détail d'une séance par sa dateKey (YYYY-MM-DD) ou son ID
   */
  async getWorkoutByDateKey(dateKey: string): Promise<WorkoutSession | null> {
    try {
      return await apiClient.get<WorkoutSession>(`workouts/${dateKey}`);
    } catch (error) {
      console.warn(
        `API workoutService.getWorkoutByDateKey(${dateKey}) fallback:`,
        error,
      );
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
        `API workoutService.updateWorkout(${identifier}) fallback:`,
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
      console.warn("API workoutService.submitRpeCheckIn fallback:", error);
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
        `API workoutService.adaptSessionWithAI(${identifier}, ${adaptationType}) fallback:`,
        error,
      );
      throw error;
    }
  },
};
