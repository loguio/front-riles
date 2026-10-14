import { UserProfile, UserRule } from "../types";
import { apiClient, ApiError } from "./apiClient";

/**
 * RILES-015 : le profil de secours (« Marius ») a disparu.
 * Un backend indisposable produit une erreur visible, jamais un profil local.
 */
export const userService = {
  /**
   * Récupère le profil complet de l'utilisateur depuis l'API NestJS
   */
  async getProfile(): Promise<UserProfile> {
    const profile = await apiClient.get<UserProfile>("users/profile");
    if (!profile || !profile.id) {
      throw new ApiError("Payload profil utilisateur invalide", 502);
    }
    return profile;
  },

  /**
   * Met à jour le profil de l'utilisateur (objectifs, plan, etc.)
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return apiClient.patch<UserProfile>("users/profile", updates);
  },

  /**
   * Ajoute une nouvelle règle de vie / contrainte
   */
  async addRule(rule: Omit<UserRule, "id">): Promise<UserRule[]> {
    return apiClient.post<UserRule[]>("users/rules", rule);
  },

  /**
   * Supprime une règle de vie par son ID
   */
  async removeRule(ruleId: string): Promise<UserRule[]> {
    return apiClient.delete<UserRule[]>(`users/rules/${ruleId}`);
  },
};
