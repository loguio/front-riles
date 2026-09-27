import React from "react";
import { View, StyleSheet, ViewProps, ViewStyle } from "react-native";
import { Colors, BorderRadius, Shadows, Spacing } from "../../constants/theme";

export interface CardProps extends ViewProps {
  variant?: "default" | "accent" | "peach" | "flat";
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = "default",
  style,
  children,
  ...rest
}) => {
  return (
    <View
      style={[
        styles.base,
        variant === "default" && styles.default,
        variant === "accent" && styles.accent,
        variant === "peach" && styles.peach,
        variant === "flat" && styles.flat,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
  },
  default: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  accent: {
    backgroundColor: Colors.primary,
    ...Shadows.heroAccent,
  },
  peach: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  flat: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
