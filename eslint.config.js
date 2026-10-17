// Flat ESLint config for an Expo / React Native / TypeScript app.
// eslint-config-expo ships an eslintrc-style config, so we adapt it to the
// flat config format with FlatCompat.
const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "web-build/**",
      ".expo/**",
      "expo-env.d.ts",
    ],
  },
  ...compat.extends("expo"),
  {
    files: ["*.config.js", "*.config.cjs"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
  },
  {
    files: [
      "**/*.test.{js,jsx,ts,tsx}",
      "**/__tests__/**/*.{js,jsx,ts,tsx}",
      "jest.setup.js",
    ],
    languageOptions: {
      globals: {
        afterAll: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        jest: "readonly",
        test: "readonly",
      },
    },
  },
];
