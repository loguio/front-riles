import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAppLanguage } from "../../i18n/useAppLanguage";
import { Colors, BorderRadius, Spacing } from "../../constants/theme";

interface LanguageSelectorProps {
  style?: object;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  style,
}) => {
  const { currentLanguage, changeLanguage, availableLanguages } =
    useAppLanguage();

  return (
    <View style={[styles.container, style]}>
      {availableLanguages.map((lang) => {
        const isActive = currentLanguage === lang.code;
        return (
          <TouchableOpacity
            key={lang.code}
            style={[styles.langBtn, isActive && styles.activeLangBtn]}
            onPress={() => changeLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={[styles.langText, isActive && styles.activeLangText]}>
              {lang.nativeLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.badgeGray,
    padding: 4,
    borderRadius: BorderRadius.full,
  },
  langBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  activeLangBtn: {
    backgroundColor: Colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  flag: {
    fontSize: 16,
  },
  langText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  activeLangText: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
