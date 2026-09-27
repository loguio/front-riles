import { LanguageDetectorAsyncModule } from "i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const LANGUAGE_STORAGE_KEY = "@riles/user_language";
export const FALLBACK_LANGUAGE = "fr";
export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const languageDetector: LanguageDetectorAsyncModule = {
  type: "languageDetector",
  async: true,
  init: () => {},
  detect: async (): Promise<string> => {
    try {
      // 1. Lire la langue sauvegardée dans les préférences locales
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (
        savedLanguage &&
        SUPPORTED_LANGUAGES.includes(savedLanguage as SupportedLanguage)
      ) {
        return savedLanguage;
      }

      // 2. Détecter la langue système du téléphone via expo-localization
      const locales = Localization.getLocales();
      const deviceLanguage = locales?.[0]?.languageCode;

      if (
        deviceLanguage &&
        SUPPORTED_LANGUAGES.includes(deviceLanguage as SupportedLanguage)
      ) {
        return deviceLanguage;
      }

      // 3. Fallback propre par défaut
      return FALLBACK_LANGUAGE;
    } catch (error) {
      console.warn(
        "[i18n] Error detecting device language, using fallback:",
        FALLBACK_LANGUAGE,
        error,
      );
      return FALLBACK_LANGUAGE;
    }
  },
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch (error) {
      console.error("[i18n] Error caching user language preference:", error);
    }
  },
};
