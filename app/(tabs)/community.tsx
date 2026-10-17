import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
} from "../../src/constants/theme";
import { Card } from "../../src/components/ui/Card";
import { Badge } from "../../src/components/ui/Badge";
import { Button } from "../../src/components/ui/Button";
import { ErrorBoundary } from "../../src/components/ui/ErrorBoundary";
import { useApp } from "../../src/context/AppContext";
import { CommunityErrorKind } from "../../src/types/community";

/** Maps a normalised service error kind to a translated community message key. */
const ERROR_MESSAGE_KEYS = {
  network: "community:error_network",
  unauthorized: "community:error_unauthorized",
  not_found: "community:error_not_found",
  bad_request: "community:error_generic",
  server: "community:error_generic",
  unknown: "community:error_generic",
} as const satisfies Record<CommunityErrorKind, string>;

/** Resolves the locale used for date/number formatting from the i18n language. */
function resolveLocale(language: string): string {
  return language?.startsWith("en") ? "en-GB" : "fr-FR";
}

/** Formats an ISO-8601 `scheduledAt` into short date + time labels. */
function formatScheduledAt(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: iso, timeLabel: "" };
  }
  return {
    dateLabel: date.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
    timeLabel: date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/** Formats a challenge metric value with at most one decimal. */
function formatMetricValue(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 1 });
}

/** Short date for the challenge period bounds. */
function formatPeriodDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function CommunityScreenView() {
  const insets = useSafeAreaInsets();
  const {
    communityRuns,
    challenges,
    isCommunityLoading,
    communityError,
    toggleCommunityRun,
    refreshCommunity,
  } = useApp();
  const { t, i18n } = useTranslation(["community", "common"]);
  const [selectedFilter, setSelectedFilter] = useState<
    "runs" | "challenges" | "members"
  >("runs");

  const locale = resolveLocale(i18n.language);
  const featuredRun = communityRuns[0];
  const otherRuns = communityRuns.slice(1);

  const errorMessage = communityError
    ? (t(ERROR_MESSAGE_KEYS[communityError.kind]) as string)
    : "";

  const participantsLabel = (count: number): string =>
    t(
      count === 1 ? "community:participants" : "community:participants_plural",
      { count },
    ) as string;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: Math.max(insets.top, 16) + Spacing.sm },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>
            {t("community:header_subtitle")}
          </Text>
          <Text style={styles.headerTitle}>{t("community:header_title")}</Text>
          <View style={styles.cityPill}>
            <Ionicons name="location-sharp" size={14} color={Colors.primary} />
            <Text style={styles.cityText}>{t("community:header_city")}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <Ionicons
            name="notifications-outline"
            size={20}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* 2. Filter Pills */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterPill,
            selectedFilter === "runs" && styles.filterPillActive,
          ]}
          onPress={() => setSelectedFilter("runs")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterPillText,
              selectedFilter === "runs" && styles.filterPillTextActive,
            ]}
          >
            {t("community:filter_runs")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            selectedFilter === "challenges" && styles.filterPillActive,
          ]}
          onPress={() => setSelectedFilter("challenges")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterPillText,
              selectedFilter === "challenges" && styles.filterPillTextActive,
            ]}
          >
            {t("community:filter_challenges")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            selectedFilter === "members" && styles.filterPillActive,
          ]}
          onPress={() => setSelectedFilter("members")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterPillText,
              selectedFilter === "members" && styles.filterPillTextActive,
            ]}
          >
            {t("community:filter_members")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Loading state */}
      {isCommunityLoading && communityRuns.length === 0 && (
        <View style={styles.stateCard} testID="community-loading">
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.stateText}>{t("community:loading")}</Text>
        </View>
      )}

      {/* 4. Error state (no data to fall back on) */}
      {!isCommunityLoading && communityError && communityRuns.length === 0 && (
        <Card style={styles.stateCard} testID="community-error">
          <Ionicons
            name="cloud-offline-outline"
            size={28}
            color={Colors.primary}
          />
          <Text style={styles.stateTitle}>{t("community:error_title")}</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <Button
            label={t("community:retry")}
            variant="primary"
            onPress={() => refreshCommunity()}
            style={styles.stateButton}
          />
        </Card>
      )}

      {/* 5. Empty state */}
      {!isCommunityLoading && !communityError && communityRuns.length === 0 && (
        <Card style={styles.stateCard} testID="community-empty">
          <MaterialCommunityIcons
            name="run-fast"
            size={28}
            color={Colors.primary}
          />
          <Text style={styles.stateTitle}>{t("community:empty_title")}</Text>
          <Text style={styles.stateText}>{t("community:empty_hint")}</Text>
        </Card>
      )}

      {/* 6. Inline error banner when data is already displayed */}
      {communityError && communityRuns.length > 0 && (
        <View style={styles.errorBanner} testID="community-error-banner">
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      {/* 7. Featured Club Run */}
      {featuredRun && (
        <Card style={styles.featuredCard}>
          <View style={styles.featuredTopRow}>
            <Badge label={featuredRun.clubName} variant="status" />
            <View style={styles.distanceBadge}>
              <Feather name="map-pin" size={12} color={Colors.textSecondary} />
              <Text style={styles.distanceBadgeText}>
                {featuredRun.location}
              </Text>
            </View>
          </View>

          <Text style={styles.featuredTitle}>
            {featuredRun.theme || featuredRun.clubName}
          </Text>
          {featuredRun.participants.length > 0 && (
            <Text style={styles.featuredDescription}>
              {featuredRun.participants.map((p) => p.name).join(", ")}
            </Text>
          )}

          <View style={styles.featuredMetaRow}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={15} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {formatScheduledAt(featuredRun.scheduledAt, locale).dateLabel} •{" "}
                {formatScheduledAt(featuredRun.scheduledAt, locale).timeLabel}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons
                name="people-outline"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.metaText}>
                {participantsLabel(featuredRun.participantCount)}
              </Text>
            </View>
          </View>

          <Button
            label={
              featuredRun.isJoined
                ? t("community:leave_run")
                : t("community:join_run")
            }
            variant={featuredRun.isJoined ? "outline" : "primary"}
            onPress={() => toggleCommunityRun(featuredRun.id)}
          />
        </Card>
      )}

      {/* 8. Remaining Runs */}
      {otherRuns.map((run) => {
        const { dateLabel, timeLabel } = formatScheduledAt(
          run.scheduledAt,
          locale,
        );
        return (
          <Card key={run.id} style={styles.runCard}>
            <View style={styles.runCardHeader}>
              <View style={styles.runIconCircle}>
                <MaterialCommunityIcons
                  name="run-fast"
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.runContent}>
                <Text style={styles.runCategory}>{run.clubName}</Text>
                <Text style={styles.runTitle}>{run.theme || run.clubName}</Text>
                <Text style={styles.runSub}>
                  {run.location} • {dateLabel} {timeLabel}
                </Text>
              </View>
            </View>

            <View style={styles.runDivider} />

            <View style={styles.runBottomRow}>
              <Text style={styles.runAttendees}>
                {participantsLabel(run.participantCount)}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleCommunityRun(run.id)}
              >
                <Text style={styles.runActionText}>
                  {run.isJoined
                    ? t("community:leave_short")
                    : t("community:join_short")}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        );
      })}

      {/* 9. Club Challenge Cards — the contract returns an array, render all. */}
      {challenges.map((challenge) => (
        <Card key={challenge.id} variant="peach" style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <View style={styles.trophyCircle}>
              <Ionicons name="trophy" size={22} color={Colors.textWhite} />
            </View>
            <View style={styles.challengeTextCol}>
              <Text style={styles.challengeBadge}>
                {t("community:challenge_badge")}
              </Text>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
            </View>
          </View>
          <Text style={styles.challengeSubtitle}>
            {t("community:challenge_period", {
              start: formatPeriodDate(challenge.periodStart, locale),
              end: formatPeriodDate(challenge.periodEnd, locale),
            })}
          </Text>

          <View style={styles.challengeBarBg}>
            <View
              style={[
                styles.challengeBarFill,
                {
                  width: `${Math.min(Math.max(challenge.progressRatio, 0), 1) * 100}%`,
                },
              ]}
            />
          </View>
          <View style={styles.challengeNumbersRow}>
            <Text style={styles.challengeProgressText}>
              {t("community:challenge_progress", {
                value: formatMetricValue(challenge.progress, locale),
                unit: challenge.unit,
              })}
            </Text>
            <Text style={styles.challengeGoalText}>
              {t("community:challenge_goal", {
                value: formatMetricValue(challenge.target, locale),
                unit: challenge.unit,
              })}
            </Text>
          </View>
        </Card>
      ))}
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
    marginBottom: Spacing.lg,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  cityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cityText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  bellBtn: {
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

  // 2. Filter Pills
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  filterPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.textWhite,
    fontWeight: "700",
  },

  // 3-5. Loading / Error / Empty states
  stateCard: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  stateTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  stateText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  stateButton: {
    marginTop: Spacing.sm,
    alignSelf: "stretch",
  },

  // 6. Inline error banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    marginBottom: Spacing.lg,
  },
  errorBannerText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  // 7. Featured Card
  featuredCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  featuredTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceBadgeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  featuredTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  featuredDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  featuredMetaRow: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
    fontWeight: "600",
  },

  // 8. Run Card
  runCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  runCardHeader: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
  },
  runIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  runContent: {
    flex: 1,
  },
  runCategory: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  runTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  runSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  runDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  runBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  runAttendees: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  runActionText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
    color: Colors.primary,
  },

  // 9. Challenge Card
  challengeCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  trophyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeTextCol: {
    flex: 1,
  },
  challengeBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  challengeTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  challengeSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  challengeBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD7CC",
    marginBottom: Spacing.xs,
    overflow: "hidden",
  },
  challengeBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  challengeNumbersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  challengeProgressText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.primary,
  },
  challengeGoalText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});

/**
 * RILES-041 : frontière d'erreur propre à l'onglet Running Club — un plantage
 * n'emporte que cette page (état d'erreur + « Réessayer »), le reste de
 * l'app reste utilisable.
 */
export default function CommunityScreen() {
  return (
    <ErrorBoundary title="Le Running Club n'a pas pu être affiché">
      <CommunityScreenView />
    </ErrorBoundary>
  );
}
