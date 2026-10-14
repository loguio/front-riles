import { afterEach, describe, expect, it, vi } from "vitest";
import { simulateNetwork } from "./api";

describe("simulateNetwork", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the payload after the default 250ms latency", async () => {
    vi.useFakeTimers();

    const promise = simulateNetwork({ steps: 3 });
    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(249);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toEqual({ steps: 3 });
  });

  it("honours a custom delay", async () => {
    vi.useFakeTimers();

    const promise = simulateNetwork("payload", 40);
    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(39);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe("payload");
  });

  it("returns the exact value it was given (no copy, no serialization)", async () => {
    vi.useFakeTimers();

    const payload = { nested: { list: [1, 2, 3] }, fn: () => "kept" };
    const promise = simulateNetwork(payload);

    await vi.advanceTimersByTimeAsync(250);
    const result = await promise;

    expect(result).toBe(payload);
    expect(result.fn()).toBe("kept");
  });

  it("never rejects for plain data", async () => {
    vi.useFakeTimers();

    const promise = simulateNetwork(null);
    await vi.advanceTimersByTimeAsync(250);

    await expect(promise).resolves.toBeNull();
  });
});
