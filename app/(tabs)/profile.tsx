import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
} from "../../src/constants/theme";
import { Card } from "../../src/components/ui/Card";
import { LanguageSelector } from "../../src/components/ui/LanguageSelector";
import { useApp } from "../../src/context/AppContext";
import { useTranslation } from "react-i18next";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, resetOnboarding, refreshAllData } = useApp();
  const { t } = useTranslation(["profile", "common"]);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const goal = user?.activeGoal || {
    title: "Semi-marathon de Paris",
    target: "Passer sous les 2h",
    raceDate: "17 mars 2025",
    weeksRemaining: 6,
    progressPercentage: 65,
  };

  const stats = user?.stats || {
    activeWeeks: 12,
    totalKm: 328,
    completedRaces: 4,
  };

  const rules = user?.rules || [];

  const handleRestartOnboarding = async () => {
    await resetOnboarding();
    router.replace("/onboarding" as any);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAllData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: Math.max(insets.top, 16) + Spacing.sm },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* 1. Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>
            {t("profile:header.section")}
          </Text>
          <Text style={styles.headerTitle}>
            {t("profile:header.greeting", { name: user?.name || "Marius" })}
          </Text>
          <Text style={styles.headerBio}>{t("profile:header.bio")}</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          activeOpacity={0.7}
          onPress={() => setShowSettingsModal(!showSettingsModal)}
        >
          <Feather name="settings" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Settings / Developer Testing Dropdown */}
      {showSettingsModal && (
        <Card style={styles.settingsCard}>
          <Text style={styles.settingsCardTitle}>
            {t("profile:settings.title")}
          </Text>
          <View style={styles.languageSettingSection}>
            <Text style={styles.languageSettingLabel}>
              {t("profile:settings.language")}
            </Text>
            <LanguageSelector style={{ marginTop: 6 }} />
          </View>
          <TouchableOpacity
            style={styles.restartOnboardingBtn}
            onPress={handleRestartOnboarding}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-circle" size={20} color={Colors.primary} />
            <Text style={styles.restartOnboardingText}>
              {t("profile:settings.restart_onboarding")}
            </Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* 2. Active Goal Card */}
      <Card style={styles.goalCard}>
        <View style={styles.goalTopRow}>
          <Text style={styles.goalSubtitle}>OBJECTIF ACTIF</Text>
          <View style={styles.goalStatusBadge}>
            <View style={styles.orangeDot} />
            <Text style={styles.goalStatusText}>En cours</Text>
          </View>
        </View>

        <View style={styles.goalBodyRow}>
          <View style={styles.goalTextCol}>
            <Text style={styles.raceName}>{goal.title}</Text>
            <Text style={styles.raceTarget}>{goal.target}</Text>
            <Text style={styles.raceDate}>
              {goal.raceDate} • dans {goal.weeksRemaining} semaines
            </Text>
          </View>

          {/* Circular Progress Gauge */}
          <View style={styles.progressCircleContainer}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercentText}>
                {goal.progressPercentage}%
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.goalProgressBarBg}>
          <View
            style={[
              styles.goalProgressBarFill,
              { width: `${goal.progressPercentage}%` },
            ]}
          />
        </View>

        {/* Action Link */}
        <TouchableOpacity
          style={styles.viewPlanLink}
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/calendar")}
        >
          <Text style={styles.viewPlanText}>Voir le plan</Text>
          <Feather name="arrow-right" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </Card>

      {/* 3. Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statNumber}>{stats.activeWeeks}</Text>
          <Text style={styles.statLabel}>Semaines actives</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statNumber}>{stats.totalKm}</Text>
          <Text style={styles.statLabel}>km parcourus</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statNumber}>
            {stats.completedRaces.toString().padStart(2, "0")}
          </Text>
          <Text style={styles.statLabel}>courses terminées</Text>
        </View>
      </View>

      {/* 4. Ce qui te guide / Règles de vie */}
      <View style={styles.rulesSection}>
        <View style={styles.rulesHeaderRow}>
          <View>
            <Text style={styles.rulesSubtitle}>CE QUI TE GUIDE</Text>
            <Text style={styles.rulesTitle}>Tes règles de vie</Text>
          </View>
          <TouchableOpacity style={styles.moreOptionsBtn} activeOpacity={0.7}>
            <Feather
              name="more-horizontal"
              size={20}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Dynamic Rules */}
        {rules.map((rule) => (
          <TouchableOpacity
            key={rule.id}
            style={styles.ruleCard}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <View style={styles.ruleIconBox}>
              <MaterialCommunityIcons
                name={(rule.icon as any) || "bullseye-arrow"}
                size={22}
                color={Colors.primary}
              />
            </View>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleItemTitle}>{rule.title}</Text>
              <Text style={styles.ruleItemSub}>{rule.description}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}

        {/* Add constraint button */}
        <TouchableOpacity
          style={styles.addConstraintBtn}
          activeOpacity={0.7}
          onPress={() => router.push("/chat" as any)}
        >
          <Feather name="help-circle" size={18} color={Colors.textSecondary} />
          <Text style={styles.addConstraintText}>
            Ajouter une contrainte avec l'IA
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl * 2,
  },

  // 1. Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  headerBio: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.subtle,
  },
  settingsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: "#FFF9F7",
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  settingsCardTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  languageSettingSection: {
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  languageSettingLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  restartOnboardingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restartOnboardingText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
    color: Colors.primary,
  },

  // 2. Goal Card
  goalCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  goalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  goalSubtitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  goalStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  orangeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  goalStatusText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  goalBodyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  goalTextCol: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  raceName: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginBottom: 4,
  },
  raceTarget: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  raceDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  progressCircleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 5,
    borderColor: Colors.primary,
    borderLeftColor: "#FFD4C7",
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercentText: {
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    color: Colors.primary,
  },
  goalProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F1F5F9",
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  goalProgressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  viewPlanLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewPlanText: {
    fontSize: Typography.sizes.base,
    fontWeight: "700",
    color: Colors.primary,
  },

  // 3. Stats Row
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },

  // 4. Rules Section
  rulesSection: {
    marginTop: Spacing.sm,
  },
  rulesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  rulesSubtitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  rulesTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  moreOptionsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.badgeGray,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  ruleIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleContent: {
    flex: 1,
  },
  ruleItemTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  ruleItemSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  addConstraintBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: Spacing.lg,
  },
  addConstraintText: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});
