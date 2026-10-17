import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  BorderRadius,
  Colors,
  Spacing,
  Typography,
} from "../../constants/theme";
import { Button } from "../ui/Button";
import { EntitlementState } from "../../types/billing";

export interface ProStatusCardProps {
  state: EntitlementState;
  /** Days left in the free trial, shown when `state === "trial"`. */
  trialDaysRemaining?: number;
  /** While true the entitlement is still unknown: render a neutral placeholder. */
  isLoading?: boolean;
  /** Opens the paywall (upgrade affordance). */
  onUpgrade: () => void;
}

/**
 * Compact plan/entitlement status: shows the remaining trial days while on
 * trial, and an upgrade affordance on BASIC or expired. Hidden for Pro users
 * (nothing to sell). While `isLoading`, renders a neutral placeholder so a Pro
 * user never sees a free-plan upsell during the initial fetch.
 */
export function ProStatusCard({
  state,
  trialDaysRemaining = 0,
  isLoading = false,
  onUpgrade,
}: ProStatusCardProps) {
  const { t } = useTranslation(["billing", "common"]);

  if (isLoading) {
    return (
      <View style={styles.card} testID="pro-status-card">
        <View style={styles.iconBox}>
          <MaterialCommunityIcons
            name="crown-outline"
            size={20}
            color={Colors.textMuted}
          />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.statusHint}>{t("common:labels.loading")}</Text>
        </View>
      </View>
    );
  }

  if (state === "pro") {
    return (
      <View style={styles.card} testID="pro-status-card">
        <View style={styles.iconBox}>
          <MaterialCommunityIcons
            name="crown"
            size={20}
            color={Colors.primary}
          />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.statusLabel}>{t("billing:status_pro")}</Text>
        </View>
        <Feather name="check-circle" size={18} color={Colors.success} />
      </View>
    );
  }

  const isTrial = state === "trial";
  const statusText = isTrial
    ? t("billing:trial_days", { count: trialDaysRemaining })
    : t("billing:status_basic");

  return (
    <View style={styles.card} testID="pro-status-card">
      <View style={styles.iconBox}>
        <MaterialCommunityIcons
          name={isTrial ? "timer-sand" : "crown-outline"}
          size={20}
          color={Colors.primary}
        />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.statusLabel}>{statusText}</Text>
        <Text style={styles.statusHint}>{t("billing:gate_message")}</Text>
      </View>
      <Button
        label={t("billing:upgrade")}
        onPress={onUpgrade}
        variant="primary"
        style={styles.upgradeBtn}
        textStyle={styles.upgradeBtnText}
        accessibilityLabel={t("billing:a11y_open_paywall")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  statusLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  statusHint: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginTop: 2,
  },
  upgradeBtn: {
    paddingVertical: 9,
    paddingHorizontal: Spacing.lg,
  },
  upgradeBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
  },
});
