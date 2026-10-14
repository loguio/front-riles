import { ChatMessage, QuickPrompt, CoachContext } from "../types";
import { apiClient, ApiError } from "./apiClient";

/**
 * RILES-015 / RILES-016 : plus aucun repli silencieux.
 * - un appel en échec REJETTE (l'écran affiche un état d'erreur) ;
 * - un historique réellement vide renvoie un tableau vide (état vide),
 *   jamais une conversation fabriquée.
 */
export const chatService = {
  /**
   * Récupère l'historique des échanges avec le Coach IA depuis NestJS.
   * Échec réseau/HTTP => throw. Historique vide => [].
   */
  async getChatHistory(): Promise<ChatMessage[]> {
    const messages = await apiClient.get<ChatMessage[]>("coach/history");
    if (!Array.isArray(messages)) {
      throw new ApiError(
        "Historique de conversation invalide reçu du serveur",
        502,
      );
    }
    return messages;
  },

  /**
   * Récupère les suggestions rapides de messages
   */
  async getQuickPrompts(): Promise<QuickPrompt[]> {
    const prompts = await apiClient.get<QuickPrompt[]>("coach/quick-prompts");
    if (!Array.isArray(prompts)) {
      throw new ApiError("Suggestions de messages invalides", 502);
    }
    return prompts;
  },

  /**
   * Envoie un message au Coach IA et reçoit sa réponse contextuelle.
   * La réponse vient exclusivement du backend : aucun message de coach
   * n'est fabriqué localement en cas d'échec.
   */
  async sendMessage(
    text: string,
    context?: CoachContext,
  ): Promise<{ userMsg: ChatMessage; coachReply: ChatMessage }> {
    return apiClient.post<{ userMsg: ChatMessage; coachReply: ChatMessage }>(
      "coach/chat",
      { text, context },
    );
  },

  /**
   * Réinitialise le chat avec le Coach IA
   */
  async resetChat(): Promise<void> {
    await apiClient.post("coach/reset");
  },
};
