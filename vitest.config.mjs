import { fileURLToPath } from "node:url";

/**
 * Headless test harness — no emulator, no device, no browser.
 * Only pure-TS modules (utils / service helpers / constants) are tested here;
 * anything importing the react-native or expo runtime must be mocked instead.
 */
export default {
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**", ".expo/**", "dist/**"],
    passWithNoTests: false,
  },
};
