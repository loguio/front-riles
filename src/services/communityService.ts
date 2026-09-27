import { CommunityRun, MonthlyChallenge } from "../types";
import { INITIAL_COMMUNITY_RUNS, INITIAL_CHALLENGE } from "../mock/mockData";
import { simulateNetwork } from "./api";

let memoryRuns: CommunityRun[] = [...INITIAL_COMMUNITY_RUNS];
let memoryChallenge: MonthlyChallenge = { ...INITIAL_CHALLENGE };

export const communityService = {
  /**
   * Fetches community runs
   */
  async getCommunityRuns(): Promise<CommunityRun[]> {
    return simulateNetwork(memoryRuns);
  },

  /**
   * Toggles user registration for a community run
   */
  async toggleRunRegistration(runId: string): Promise<CommunityRun> {
    memoryRuns = memoryRuns.map((run) => {
      if (run.id === runId) {
        const isRegistered = !run.isUserRegistered;
        return {
          ...run,
          isUserRegistered: isRegistered,
          attendeesCount: isRegistered
            ? run.attendeesCount + 1
            : run.attendeesCount - 1,
        };
      }
      return run;
    });

    const targetRun = memoryRuns.find((r) => r.id === runId);
    if (!targetRun) throw new Error("Run not found");

    return simulateNetwork(targetRun);
  },

  /**
   * Gets current monthly challenge
   */
  async getMonthlyChallenge(): Promise<MonthlyChallenge> {
    return simulateNetwork(memoryChallenge);
  },
};
