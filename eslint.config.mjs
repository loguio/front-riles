import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

/**
 * react-hooks recommended rules, demoted to "warn" except rules-of-hooks.
 * Filtering by what the plugin actually declares keeps this config resilient
 * when the plugin adds/removes compiler rules between versions.
 */
function relaxReactHooksRules(rules) {
  return Object.fromEntries(
    Object.entries(rules).map(([name, severity]) => [
      name,
      name === "react-hooks/rules-of-hooks" || severity !== "error"
        ? severity
        : "warn",
    ]),
  );
}

/**
 * Flat ESLint config for the Riles Expo / React Native app.
 *
 * - typescript-eslint (recommended, non type-checked: fast, no tsconfig project
 *   loading needed in CI)
 * - eslint-plugin-react-hooks (rules-of-hooks / exhaustive-deps)
 * - React Native friendly environment: hermes/react-native globals, `__DEV__`,
 *   RN-specific rules kept off (formatting is delegated to Prettier)
 * - eslint-config-prettier last so it wins over any stylistic rule
 *
 * Rules are tuned to pass on the existing app code on purpose: this config is a
 * safety net, not a refactor mandate.
 */
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "web-build/**",
      "coverage/**",
      ".github/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,cjs,mjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals["react-native"],
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Start from the plugin's recommended rules, then relax everything but
      // rules-of-hooks to "warn" so the existing tree stays green.
      ...relaxReactHooksRules(reactHooks.configs["recommended-latest"].rules),

      // TypeScript already catches these; the base ESLint rules produce noise.
      "no-undef": "off",
      "no-unused-vars": "off",
      // Dead imports/vars exist in the current tree; report them without
      // failing the build (tuning, not refactoring).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // Existing services and components use `any` on purpose (API payloads).
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description" },
      ],

      // Practical rules: keep real bugs as errors, style as warnings.
      eqeqeq: ["error", "smart"],
      "no-var": "error",
      "prefer-const": "error",
      "no-constant-binary-expression": "error",
      "no-self-compare": "error",
      "no-useless-assignment": "warn",
      "no-unmodified-loop-condition": "error",
      "no-unreachable-loop": "error",
      "require-atomic-updates": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-console": "warn",
      "no-debugger": "warn",

      // react-hooks: rules-of-hooks is the only hard error (the app cannot work
      // without it); every other hook rule is a warning so the current tree is
      // green without touching app code.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // Node-only tooling files.
    files: ["*.config.{js,mjs,cjs,ts}", "eslint.config.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Tests: vitest globals come from explicit imports, keep it permissive.
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-console": "off",
    },
  },
  prettier,
);
