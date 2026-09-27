import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { QuickPrompt } from "../../types";
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
} from "../../constants/theme";

interface QuickSuggestionsProps {
  prompts: QuickPrompt[];
  onSelectPrompt: (prompt: QuickPrompt) => void;
  disabled?: boolean;
}

export const QuickSuggestions: React.FC<QuickSuggestionsProps> = ({
  prompts,
  onSelectPrompt,
  disabled = false,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {prompts.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.chip, disabled && styles.chipDisabled]}
          onPress={() => onSelectPrompt(p)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.chipText}>{p.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    ...Shadows.subtle,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
});
