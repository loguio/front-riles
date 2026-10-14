import { describe, expect, it } from "vitest";
import { INITIAL_CHALLENGE, INITIAL_COMMUNITY_RUNS } from "../mock/mockData";
import { communityService } from "./communityService";

/**
 * communityService is an in-memory service: it depends on ../mock/mockData
 * (pure TS) and ./api (setTimeout only), so it runs headless under Vitest.
 */
describe("communityService", () => {
  it("returns the seeded community runs", async () => {
    const runs = await communityService.getCommunityRuns();

    expect(runs).toHaveLength(INITIAL_COMMUNITY_RUNS.length);
    expect(runs.map((r) => r.id)).toEqual(
      INITIAL_COMMUNITY_RUNS.map((r) => r.id),
    );
    expect(runs[0].title).toBe("Sortie collective du jeudi soir");
    expect(runs[0].attendeesCount).toBe(12);
    expect(runs[0].isUserRegistered).toBe(false);
  });

  it("registers a user: flips the flag and increments the attendee count", async () => {
    const before = (await communityService.getCommunityRuns()).find(
      (r) => r.id === "run-1",
    );
    expect(before).toBeDefined();

    const registered = await communityService.toggleRunRegistration("run-1");
    expect(registered.id).toBe("run-1");
    expect(registered.isUserRegistered).toBe(true);
    expect(registered.attendeesCount).toBe(before!.attendeesCount + 1);
  });

  it("unregisters a user: flips the flag back and decrements the count", async () => {
    const before = (await communityService.getCommunityRuns()).find(
      (r) => r.id === "run-1",
    );
    expect(before?.isUserRegistered).toBe(true);

    const unregistered = await communityService.toggleRunRegistration("run-1");
    expect(unregistered.isUserRegistered).toBe(false);
    expect(unregistered.attendeesCount).toBe(before!.attendeesCount - 1);

    // Round trip returns to the seeded values.
    expect(unregistered.attendeesCount).toBe(
      INITIAL_COMMUNITY_RUNS[0].attendeesCount,
    );
  });

  it("leaves other runs untouched when toggling one run", async () => {
    await communityService.toggleRunRegistration("run-1");
    const runs = await communityService.getCommunityRuns();
    const other = runs.find((r) => r.id === "run-2");

    expect(other?.isUserRegistered).toBe(
      INITIAL_COMMUNITY_RUNS[1].isUserRegistered,
    );
    expect(other?.attendeesCount).toBe(
      INITIAL_COMMUNITY_RUNS[1].attendeesCount,
    );

    // Restore run-1 to its seeded state.
    await communityService.toggleRunRegistration("run-1");
  });

  it("rejects with a clear error for an unknown run id", async () => {
    await expect(
      communityService.toggleRunRegistration("does-not-exist"),
    ).rejects.toThrow("Run not found");
  });

  it("returns the seeded monthly challenge", async () => {
    const challenge = await communityService.getMonthlyChallenge();

    expect(challenge.id).toBe(INITIAL_CHALLENGE.id);
    expect(challenge.title).toBe("100 km sans culpabilité");
    expect(challenge.currentKm).toBe(62);
    expect(challenge.targetKm).toBe(100);
    expect(challenge.currentKm).toBeLessThan(challenge.targetKm);
  });
});
