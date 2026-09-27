/**
 * Mock API Utilities
 * Simulates network latency and provides clean async execution.
 * When plugging in a real REST / GraphQL backend, only this client and service implementations will change.
 */

const DEFAULT_LATENCY_MS = 250;

export async function simulateNetwork<T>(
  data: T,
  delayMs = DEFAULT_LATENCY_MS,
): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, delayMs);
  });
}
