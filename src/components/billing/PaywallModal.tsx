import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "../../constants/theme";
import { Button } from "../ui/Button";
import { Entitlement, EntitlementState } from "../../types/billing";

export interface PaywallModalProps {
  visible: boolean;
  state: EntitlementState;
  /** Days left in the free trial, shown when `state === "trial"`. */
  trialDaysRemaining?: number;
  onClose: () => void;
  onSubscribe?: () => void;
  /**
   * Restores previous purchases. Returns the resulting entitlement so the modal
   * can confirm the outcome instead of leaving the affordance inert.
   */
  onRestore?: () => Promise<Entitlement | null> | void;
  isSubscribing?: boolean;
  /** True when the last subscribe attempt failed; shows an inline error. */
  error?: boolean;
}

const BENEFITS = [
  {
    icon: "autorenew",
    titleKey: "billing:benefits.dynamic_title",
    descKey: "billing:benefits.dynamic_desc",
  },
  {
    icon: "chat-processing-outline",
    titleKey: "billing:benefits.coach_title",
    descKey: "billing:benefits.coach_desc",
  },
  {
    icon: "chart-timeline-variant",
    titleKey: "billing:benefits.analysis_title",
    descKey: "billing:benefits.analysis_desc",
  },
] as const;

/**
 * Paywall presented as a dismissible modal at the point of a gated action.
 *
 * Presentational: it renders whatever entitlement state the caller passes and
 * never blocks navigation on its own. When the user is already Pro it shows a
 * short confirmation instead of the subscribe CTA.
 */
export function PaywallModal({
  visible,
  state,
  trialDaysRemaining = 0,
  onClose,
  onSubscribe,
  onRestore,
  isSubscribing = false,
  error = false,
}: PaywallModalProps) {
  const { t } = useTranslation(["billing", "common"]);
  const isPro = state === "pro";
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<
    "idle" | "done" | "empty" | "error"
  >("idle");

  const handleRestore = async () => {
    if (!onRestore || isRestoring) return;
    setIsRestoring(true);
    setRestoreResult("idle");
    try {
      const next = await onRestore();
      setRestoreResult(next?.isPro ? "done" : "empty");
    } catch {
      // Restore can reject (e.g. a real RevenueCat client); surface it inline
      // instead of leaving the affordance stuck.
      setRestoreResult("error");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Tapping the backdrop dismisses the paywall (soft gate). */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t("billing:close")}
        />

        <View style={styles.sheet} testID="paywall-modal">
          <View style={styles.grabber} />

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("billing:close")}
            testID="paywall-close"
          >
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {isPro ? (
              <View style={styles.alreadyProBox}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={40}
                  color={Colors.primary}
                />
                <Text style={styles.title}>{t("billing:already_pro_title")}</Text>
                <Text style={styles.subtitle}>
                  {t("billing:already_pro_subtitle")}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.heroIcon}>
                  <MaterialCommunityIcons
                    name="crown-outline"
                    size={26}
                    color={Colors.textWhite}
                  />
                </View>

                <Text style={styles.title}>{t("billing:title")}</Text>
                <Text style={styles.subtitle}>{t("billing:subtitle")}</Text>

                <View style={styles.trialBadge}>
                  <Ionicons name="gift-outline" size={15} color={Colors.primary} />
                  <Text style={styles.trialBadgeText}>
                    {t("billing:trial_badge")}
                  </Text>
                </View>

                {state === "trial" && trialDaysRemaining > 0 && (
                  <Text
                    style={styles.trialRemaining}
                    testID="paywall-trial-days"
                  >
                    {t("billing:trial_days", { count: trialDaysRemaining })}
                  </Text>
                )}

                <View style={styles.benefits}>
                  {BENEFITS.map((benefit) => (
                    <View key={benefit.titleKey} style={styles.benefitRow}>
                      <View style={styles.benefitIconBox}>
                        <MaterialCommunityIcons
                          name={benefit.icon}
                          size={20}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={styles.benefitTextCol}>
                        <Text style={styles.benefitTitle}>
                          {t(benefit.titleKey)}
                        </Text>
                        <Text style={styles.benefitDesc}>
                          {t(benefit.descKey)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <Button
                  label={isSubscribing ? t("billing:cta_loading") : t("billing:cta")}
                  onPress={onSubscribe}
                  disabled={isSubscribing}
                  style={styles.cta}
                />
                <Text style={styles.priceNote}>{t("billing:price_note")}</Text>

                {error && (
                  <Text style={styles.errorText} testID="paywall-error">
                    {t("billing:error")}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.restoreBtn}
                  onPress={handleRestore}
                  disabled={isRestoring}
                  accessibilityRole="button"
                >
                  <Text style={styles.restoreText}>
                    {isRestoring
                      ? t("common:labels.loading")
                      : t("billing:restore")}
                  </Text>
                </TouchableOpacity>
                {restoreResult !== "idle" && (
                  <Text
                    style={[
                      styles.restoreFeedback,
                      restoreResult === "error" && styles.restoreError,
                    ]}
                    testID="restore-feedback"
                  >
                    {restoreResult === "done"
                      ? t("billing:restore_done")
                      : restoreResult === "error"
                        ? t("billing:error")
                        : t("billing:restore_empty")}
                  </Text>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onClose}
              accessibilityRole="button"
              testID="paywall-dismiss"
            >
              <Text style={styles.dismissText}>{t("billing:dismiss")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingTop: Spacing.sm,
    maxHeight: "88%",
    ...Shadows.cardHover,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  closeBtn: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.badgeGray,
    zIndex: 2,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    ...Shadows.heroAccent,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontWeight: "500",
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  trialBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
  trialRemaining: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  benefits: {
    marginTop: Spacing.xl,
    gap: Spacing.lg,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  benefitIconBox: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
    lineHeight: 18,
  },
  cta: {
    marginTop: Spacing.xxl,
  },
  priceNote: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textAlign: "center",
    fontWeight: "500",
  },
  restoreBtn: {
    marginTop: Spacing.md,
    alignItems: "center",
    paddingVertical: 6,
  },
  restoreText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
    color: Colors.primary,
  },
  restoreFeedback: {
    marginTop: 6,
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  restoreError: {
    color: Colors.zone5,
  },
  errorText: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    color: Colors.zone5,
    textAlign: "center",
  },
  dismissBtn: {
    marginTop: Spacing.sm,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  dismissText: {
    fontSize: Typography.sizes.base,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  alreadyProBox: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
});
