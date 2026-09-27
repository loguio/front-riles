import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from "react-native";
import {
  Colors,
  BorderRadius,
  Spacing,
  Typography,
  Shadows,
} from "../../constants/theme";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "white" | "outline" | "ghost";
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = "primary",
  icon,
  rightIcon,
  style,
  textStyle,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        variant === "primary" && styles.primary,
        variant === "white" && styles.white,
        variant === "outline" && styles.outline,
        variant === "ghost" && styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && <View style={styles.leftIcon}>{icon}</View>}
      <Text
        style={[
          styles.baseText,
          variant === "primary" && styles.primaryText,
          variant === "white" && styles.whiteText,
          variant === "outline" && styles.outlineText,
          variant === "ghost" && styles.ghostText,
          textStyle,
        ]}
      >
        {label}
      </Text>
      {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  baseText: {
    textAlign: "center",
  },
  primary: {
    backgroundColor: Colors.primary,
    ...Shadows.buttonAccent,
  },
  primaryText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.md,
    fontWeight: "700",
  },
  white: {
    backgroundColor: Colors.card,
    ...Shadows.card,
  },
  whiteText: {
    color: Colors.primary,
    fontSize: Typography.sizes.md,
    fontWeight: "700",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  outlineText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: "600",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  ghostText: {
    color: Colors.primary,
    fontSize: Typography.sizes.base,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
  leftIcon: {
    marginRight: 10,
  },
  rightIcon: {
    marginLeft: 10,
  },
});
