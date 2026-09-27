import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import {
  Colors,
  BorderRadius,
  Spacing,
  Typography,
} from "../../constants/theme";

export interface BadgeProps {
  label: string;
  variant?: "heroTag" | "status" | "success" | "outline" | "neutral";
  icon?: React.ReactNode;
  rightDotColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "neutral",
  icon,
  rightDotColor,
  style,
  textStyle,
}) => {
  return (
    <View
      style={[
        styles.base,
        variant === "heroTag" && styles.heroTag,
        variant === "status" && styles.status,
        variant === "success" && styles.success,
        variant === "outline" && styles.outline,
        variant === "neutral" && styles.neutral,
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.baseText,
          variant === "heroTag" && styles.heroTagText,
          variant === "status" && styles.statusText,
          variant === "success" && styles.successText,
          variant === "outline" && styles.outlineText,
          variant === "neutral" && styles.neutralText,
          textStyle,
        ]}
      >
        {label}
      </Text>
      {rightDotColor && (
        <View style={[styles.dot, { backgroundColor: rightDotColor }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  iconContainer: {
    marginRight: 6,
  },
  baseText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
  },
  heroTag: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  heroTagText: {
    color: Colors.textWhite,
  },
  status: {
    backgroundColor: Colors.primaryPill,
  },
  statusText: {
    color: Colors.primary,
  },
  success: {
    backgroundColor: Colors.successLight,
  },
  successText: {
    color: Colors.successText,
  },
  outline: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outlineText: {
    color: Colors.textPrimary,
  },
  neutral: {
    backgroundColor: Colors.badgeGray,
  },
  neutralText: {
    color: Colors.textSecondary,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 6,
  },
});
