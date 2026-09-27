import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { SUPPORTED_LANGUAGES, SupportedLanguage } from "./languageDetector";

export interface LanguageInfo {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const AVAILABLE_LANGUAGES: LanguageInfo[] = [
  { code: "fr", label: "Français", nativeLabel: "Français", flag: "🇫🇷" },
  { code: "en", label: "Anglais", nativeLabel: "English", flag: "🇬🇧" },
];

export function useAppLanguage() {
  const { i18n } = useTranslation();

  const currentLanguage = (i18n.language?.split("-")[0] ||
    "fr") as SupportedLanguage;

  const changeLanguage = useCallback(
    async (lng: SupportedLanguage) => {
      if (SUPPORTED_LANGUAGES.includes(lng)) {
        await i18n.changeLanguage(lng);
      }
    },
    [i18n],
  );

  return {
    currentLanguage,
    changeLanguage,
    availableLanguages: AVAILABLE_LANGUAGES,
    isFrench: currentLanguage === "fr",
    isEnglish: currentLanguage === "en",
  };
}
