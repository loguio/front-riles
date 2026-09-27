import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../constants/theme";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps?: number;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps = 5,
}) => {
  return (
    <View style={styles.container}>
      {/* Top row: Logo, Slogan, Step counter */}
      <View style={styles.topRow}>
        <View style={styles.logoAndTitle}>
          <View style={styles.logoSquare}>
            <Text style={styles.logoLetter}>P</Text>
          </View>
          <Text style={styles.headerSubtitle}>Ton plan, à ton rythme</Text>
        </View>
        <Text style={styles.stepIndicator}>
          {currentStep} / {totalSteps}
        </Text>
      </View>

      {/* 5 Segmented Progress Bars */}
      <View style={styles.barsRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isFilled = stepNumber <= currentStep;
          return (
            <View
              key={index}
              style={[
                styles.barSegment,
                isFilled ? styles.barFilled : styles.barEmpty,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  logoAndTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  logoSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    color: Colors.textWhite,
    fontSize: 20,
    fontWeight: "900",
    fontStyle: "italic",
  },
  headerSubtitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  stepIndicator: {
    fontSize: Typography.sizes.base,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  barsRow: {
    flexDirection: "row",
    gap: 8,
  },
  barSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  barFilled: {
    backgroundColor: Colors.primary,
  },
  barEmpty: {
    backgroundColor: "#E2E8F0",
  },
});
