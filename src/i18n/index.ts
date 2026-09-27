import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  languageDetector,
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from "./languageDetector";
import { resources, defaultNS } from "./locales";
import "./types"; // Typage strict des clés

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v4", // Requis pour React Native Android (Hermes/JSC)
    resources,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS,
    interpolation: {
      escapeValue: false, // React protège déjà contre le XSS
    },
    react: {
      useSuspense: false, // Évite les soucis de suspense en React Native
    },
  });

export default i18n;
export { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES };
export type { SupportedLanguage };
