import { ChatMessage, QuickPrompt, CoachContext } from "../types";
import { apiClient } from "./apiClient";
import { INITIAL_CHAT_MESSAGES, QUICK_PROMPTS } from "../mock/mockData";

export const chatService = {
  /**
   * Récupère l'historique des échanges avec le Coach IA depuis NestJS
   */
  async getChatHistory(): Promise<ChatMessage[]> {
    try {
      const messages = await apiClient.get<ChatMessage[]>("coach/history");
      if (Array.isArray(messages) && messages.length > 0) {
        return messages;
      }
      return INITIAL_CHAT_MESSAGES;
    } catch (error) {
      console.warn("API chatService.getChatHistory fallback:", error);
      return INITIAL_CHAT_MESSAGES;
    }
  },

  /**
   * Récupère les suggestions rapides de messages
   */
  async getQuickPrompts(): Promise<QuickPrompt[]> {
    try {
      const prompts = await apiClient.get<QuickPrompt[]>("coach/quick-prompts");
      if (Array.isArray(prompts) && prompts.length > 0) {
        return prompts;
      }
      return QUICK_PROMPTS;
    } catch (error) {
      console.warn("API chatService.getQuickPrompts fallback:", error);
      return QUICK_PROMPTS;
    }
  },

  /**
   * Envoie un message au Coach IA et reçoit sa réponse contextuelle
   */
  async sendMessage(
    text: string,
    context?: CoachContext,
  ): Promise<{ userMsg: ChatMessage; coachReply: ChatMessage }> {
    try {
      return await apiClient.post<{
        userMsg: ChatMessage;
        coachReply: ChatMessage;
      }>("coach/chat", { text, context });
    } catch (error) {
      console.warn("API chatService.sendMessage fallback:", error);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text,
        timestamp: timeStr,
      };

      let replyText =
        "Bien reçu ! J'ai réajusté ta charge d'entraînement pour garantir ta progression sans fatigue excessive.";
      let suggestedAction: ChatMessage["suggestedAction"] = undefined;
      const lowerText = text.toLowerCase();

      if (lowerText.includes("fatigué") || lowerText.includes("fatigue")) {
        replyText =
          "C'est noté Marius. Quand le corps est fatigué, insister sur du seuil augmente le risque de blessure. Je te propose d'alléger la séance de ce soir.";
        suggestedAction = {
          type: "reduce_intensity",
          label: "Appliquer : Alléger la séance à 35 min",
          applied: false,
          details: "lighten",
        };
      } else if (
        lowerText.includes("décaler") ||
        lowerText.includes("imprévu") ||
        lowerText.includes("demain")
      ) {
        replyText =
          "Pas de problème, l'entraînement s'adapte à ta vie. Je bascule la séance qualitative sur demain et je place ton repos aujourd'hui.";
        suggestedAction = {
          type: "reschedule",
          label: "Appliquer : Décaler le seuil à demain",
          applied: false,
          details: "postpone",
        };
      } else if (
        lowerText.includes("cool") ||
        lowerText.includes("30 min") ||
        lowerText.includes("souple")
      ) {
        replyText =
          "Excellente initiative. 30 minutes de footing régénérant en Zone 1-2 vont stimuler la récupération sans générer de fatigue résiduelle.";
        suggestedAction = {
          type: "adjust_workout",
          label: "Appliquer : Remplacer par 30 min cool",
          applied: false,
          details: "easy_run",
        };
      } else if (
        lowerText.includes("mollet") ||
        lowerText.includes("douleur") ||
        lowerText.includes("gêne") ||
        lowerText.includes("blessure")
      ) {
        replyText =
          "Prudence avant tout ! Une gêne au mollet peut vite évoluer en contracture. Je te conseille 20 min de mobilité sans impact et du glaçage ce soir.";
        suggestedAction = {
          type: "reduce_intensity",
          label: "Appliquer : Repos mollet & Mobilité",
          applied: false,
          details: "injury_care",
        };
      }

      const coachReply: ChatMessage = {
        id: `coach-${Date.now() + 1}`,
        sender: "coach",
        text: replyText,
        timestamp: timeStr,
        suggestedAction,
      };

      return { userMsg, coachReply };
    }
  },

  /**
   * Réinitialise le chat avec le Coach IA
   */
  async resetChat(): Promise<void> {
    try {
      await apiClient.post("coach/reset");
    } catch (error) {
      console.warn("API chatService.resetChat fallback:", error);
    }
  },
};
