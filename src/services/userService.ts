import { UserProfile, UserRule } from "../types";
import { apiClient } from "./apiClient";
import { INITIAL_USER } from "../mock/mockData";

export const userService = {
  /**
   * Récupère le profil complet de l'utilisateur depuis l'API NestJS
   */
  async getProfile(): Promise<UserProfile> {
    try {
      return await apiClient.get<UserProfile>("users/profile");
    } catch (error) {
      console.warn("API userService.getProfile fallback:", error);
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
      console.warn("API userService.updateProfile fallback:", error);
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
      console.warn("API userService.addRule fallback:", error);
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
      console.warn("API userService.removeRule fallback:", error);
      return INITIAL_USER.rules.filter((r) => r.id !== ruleId);
    }
  },
};
