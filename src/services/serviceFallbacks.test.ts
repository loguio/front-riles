import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * RILES-015 — régression : quand le backend échoue, les services doivent
 * REJETER (l'écran affiche un état d'erreur) et jamais renvoyer de données
 * de démonstration (profil fictif, plan au « modèle » inventé, réponses de
 * coach fabriquées, feedback RPE local, résumé Strava par défaut…).
 *
 * Le client API est intégralement mocké : aucun appel réseau.
 */
const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./apiClient", () => {
  class ApiError extends Error {
    status: number;
    data: any;
    isNetworkError: boolean;
    constructor(
      message: string,
      status = 0,
      data: any = null,
      isNetworkError = false,
    ) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
      this.isNetworkError = isNetworkError;
    }
  }
  return { apiClient: apiClientMock, ApiError };
});

import { ApiError } from "./apiClient";
import { chatService } from "./chatService";
import { onboardingService } from "./onboardingService";
import { userService } from "./userService";
import { workoutService } from "./workoutService";

const BACKEND_DOWN = "ECONNREFUSED — backend NestJS indisponible";
const serverDown = () => new Error(BACKEND_DOWN);

describe("RILES-015: a failed service call surfaces an error, never mock data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("userService", () => {
    it("getProfile rejects instead of returning the demo profile", async () => {
      apiClientMock.get.mockRejectedValueOnce(serverDown());

      await expect(userService.getProfile()).rejects.toThrow(BACKEND_DOWN);
    });

    it("updateProfile rejects instead of applying the update locally", async () => {
      apiClientMock.patch.mockRejectedValueOnce(serverDown());

      await expect(userService.updateProfile({})).rejects.toThrow(BACKEND_DOWN);
    });

    it("addRule rejects instead of inventing a rule id", async () => {
      apiClientMock.post.mockRejectedValueOnce(serverDown());

      await expect(
        userService.addRule({
          title: "Pas le lundi",
          description: "Réunion tous les lundis",
          icon: "calendar-lock",
        }),
      ).rejects.toThrow(BACKEND_DOWN);
    });

    it("removeRule rejects instead of filtering a local copy", async () => {
      apiClientMock.delete.mockRejectedValueOnce(serverDown());

      await expect(userService.removeRule("rule-1")).rejects.toThrow(
        BACKEND_DOWN,
      );
    });
  });

  describe("workoutService", () => {
    it("generateMultiWeekPlan rejects instead of fabricating a plan", async () => {
      apiClientMock.post.mockRejectedValueOnce(serverDown());

      const error = await workoutService
        .generateMultiWeekPlan()
        .catch((err) => err);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(BACKEND_DOWN);
      // Aucun plan de secours : plus de modèle inventé.
      const fabricatedModel = ["riles", "pro", "engine"].join("-");
      expect(error.message).not.toContain(fabricatedModel);
      expect(error.message).not.toContain("généré sur mesure");
    });

    it("submitRpeCheckIn rejects instead of returning a local AI feedback", async () => {
      apiClientMock.post.mockRejectedValueOnce(serverDown());

      await expect(workoutService.submitRpeCheckIn(9)).rejects.toThrow(
        BACKEND_DOWN,
      );
    });

    it("getWeekWorkouts rejects instead of returning an empty week", async () => {
      apiClientMock.get.mockRejectedValueOnce(serverDown());

      await expect(workoutService.getWeekWorkouts(42, 2026)).rejects.toThrow(
        BACKEND_DOWN,
      );
    });

    it("getMonthWorkouts rejects instead of returning an empty month", async () => {
      apiClientMock.get.mockRejectedValueOnce(serverDown());

      await expect(workoutService.getMonthWorkouts(9, 2026)).rejects.toThrow(
        BACKEND_DOWN,
      );
    });

    it("getWorkoutByDateKey rejects on a server error", async () => {
      apiClientMock.get.mockRejectedValueOnce(serverDown());

      await expect(
        workoutService.getWorkoutByDateKey("2026-10-14"),
      ).rejects.toThrow(BACKEND_DOWN);
    });

    it("getWorkoutByDateKey still resolves to null for a real 404 (empty, not failed)", async () => {
      apiClientMock.get.mockRejectedValueOnce(new ApiError("Not found", 404));

      await expect(
        workoutService.getWorkoutByDateKey("2026-10-14"),
      ).resolves.toBeNull();
    });

    it("getPlanRoadmap rejects instead of returning null", async () => {
      apiClientMock.get.mockRejectedValueOnce(serverDown());

      await expect(workoutService.getPlanRoadmap()).rejects.toThrow(
        BACKEND_DOWN,
      );
    });

    it("syncRecentActivities rejects instead of returning null", async () => {
      apiClientMock.post.mockRejectedValueOnce(serverDown());

      await expect(workoutService.syncRecentActivities()).rejects.toThrow(
        BACKEND_DOWN,
      );
    });

    it("updateWorkout and adaptSessionWithAI reject", async () => {
      apiClientMock.patch.mockRejectedValueOnce(serverDown());
      await expect(
        workoutService.updateWorkout("2026-10-14", {}),
      ).rejects.toThrow(BACKEND_DOWN);

      apiClientMock.post.mockRejectedValueOnce(serverDown());
      await expect(
        workoutService.adaptSessionWithAI("2026-10-14", "lighten"),
      ).rejects.toThrow(BACKEND_DOWN);
    });
  });

  describe("chatService", () => {
    it("sendMessage rejects instead of replying with a keyword-matched fake coach", async () => {
      apiClientMock.post.mockRejectedValueOnce(serverDown());

      const result = await chatService
        .sendMessage("je suis fatigué ce soir")
        .catch((err) => err);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe(BACKEND_DOWN);
      expect(result.coachReply).toBeUndefined();
    });

    it("getQuickPrompts rejects instead of returning the local QUICK_PROMPTS", async () => {
      apiClientMock.get.mockRejectedValueOnce(serverDown());

      await expect(chatService.getQuickPrompts()).rejects.toThrow(BACKEND_DOWN);
    });

    it("resetChat rejects instead of swallowing the failure", async () => {
      apiClientMock.post.mockRejectedValueOnce(serverDown());

      await expect(chatService.resetChat()).rejects.toThrow(BACKEND_DOWN);
    });
  });

  describe("onboardingService", () => {
    it("reformulateGoal rejects instead of returning a locally fabricated analysis", async () => {
      apiClientMock.post.mockRejectedValueOnce(serverDown());

      await expect(
        onboardingService.reformulateGoal("Marathon en 3h30"),
      ).rejects.toThrow(BACKEND_DOWN);
    });

    it("completeOnboarding rejects instead of building a local plan", async () => {
      apiClientMock.post.mockRejectedValueOnce(serverDown());

      await expect(onboardingService.completeOnboarding({})).rejects.toThrow(
        BACKEND_DOWN,
      );
    });

    it("syncStravaSixMonths rejects instead of returning the default summary", async () => {
      apiClientMock.post.mockRejectedValueOnce(serverDown());

      await expect(onboardingService.syncStravaSixMonths()).rejects.toThrow(
        BACKEND_DOWN,
      );
    });

    it("getOnboardingState, getAppsCatalog, saveStepData, resetOnboarding and getStravaOAuthUrl reject", async () => {
      apiClientMock.get.mockRejectedValueOnce(serverDown());
      await expect(onboardingService.getOnboardingState()).rejects.toThrow(
        BACKEND_DOWN,
      );

      apiClientMock.get.mockRejectedValueOnce(serverDown());
      await expect(onboardingService.getAppsCatalog()).rejects.toThrow(
        BACKEND_DOWN,
      );

      apiClientMock.get.mockRejectedValueOnce(serverDown());
      await expect(
        onboardingService.getStravaOAuthUrl("http://localhost:8081/onboarding"),
      ).rejects.toThrow(BACKEND_DOWN);

      apiClientMock.post.mockRejectedValueOnce(serverDown());
      await expect(onboardingService.saveStepData({})).rejects.toThrow(
        BACKEND_DOWN,
      );

      apiClientMock.post.mockRejectedValueOnce(serverDown());
      await expect(onboardingService.resetOnboarding()).rejects.toThrow(
        BACKEND_DOWN,
      );
    });
  });
});
