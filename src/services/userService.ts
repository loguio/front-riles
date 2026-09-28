import { UserProfile, UserRule } from "../types";
import { apiClient } from "./apiClient";
import { INITIAL_USER } from "../mock/mockData";

export const userService = {
  /**
   * Récupère le profil complet de l'utilisateur depuis l'API NestJS
   * Bascule de manière transparente sur les données mockées en cas d'indisponibilité du serveur
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const profile = await apiClient.get<UserProfile>("users/profile");
      if (profile && profile.id) {
        return profile;
      }
      throw new Error("Payload profil utilisateur invalide");
    } catch (error) {
      console.warn(
        "[Riles API Fallback] Impossible de contacter le backend NestJS (GET /users/profile). Utilisation du profil local de secours :",
        error,
      );
      return INITIAL_USER;
    }
  },

  /**
   * Met à jour le profil de l'utilisateur (objectifs, plan, etc.)
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      return await apiClient.patch<UserProfile>("users/profile", updates);
    } catch (error) {
      console.warn(
        "[Riles API Fallback] Impossible de contacter le backend NestJS (PATCH /users/profile). Application locale des modifications :",
        error,
      );
      return { ...INITIAL_USER, ...updates };
    }
  },

  /**
   * Ajoute une nouvelle règle de vie / contrainte
   */
  async addRule(rule: Omit<UserRule, "id">): Promise<UserRule[]> {
    try {
      return await apiClient.post<UserRule[]>("users/rules", rule);
    } catch (error) {
      console.warn(
        "[Riles API Fallback] Impossible de contacter le backend NestJS (POST /users/rules). Ajout local de la règle :",
        error,
      );
      return [...INITIAL_USER.rules, { ...rule, id: `rule-${Date.now()}` }];
    }
  },

  /**
   * Supprime une règle de vie par son ID
   */
  async removeRule(ruleId: string): Promise<UserRule[]> {
    try {
      return await apiClient.delete<UserRule[]>(`users/rules/${ruleId}`);
    } catch (error) {
      console.warn(
        "[Riles API Fallback] Impossible de contacter le backend NestJS (DELETE /users/rules/:id). Suppression locale :",
        error,
      );
      return INITIAL_USER.rules.filter((r) => r.id !== ruleId);
    }
  },
};
