import React, { forwardRef } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
} from "../../constants/theme";
import { WorkoutSession } from "../../types/workout";

export interface SessionShareCardProps {
  /** Session to summarise (planned and, when available, executed data). */
  session: WorkoutSession;
  style?: StyleProp<ViewStyle>;
}

/** Formats a duration in seconds as "1h05" or "42 min". */
export function formatShareDuration(sec?: number, fallback = "—"): string {
  if (!sec || sec <= 0) return fallback;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

/**
 * Visual summary card for a session: planned vs executed distance, pace,
 * duration and average heart rate. Designed to be captured as an image and
 * shared (see `shareSessionCard`).
 */
export const SessionShareCard = forwardRef<View, SessionShareCardProps>(
  ({ session, style }, ref) => {
    const { t, i18n } = useTranslation(["share", "common"]);
    const isFrench = (i18n.language || "fr").startsWith("fr");
    const empty = t("share:value_empty");

    const formatKm = (km?: number): string =>
      km === undefined || km === null
        ? empty
        : `${km.toFixed(1).replace(".", isFrench ? "," : ".")} ${t(
            "common:units.km",
          )}`;

    const isDone = session.status === "done";

    const planned = {
      distance: session.distance || empty,
      pace: session.targetPace || empty,
      duration: session.duration || empty,
      avgHr: session.targetZoneBpm || empty,
    };

    const executed = {
      distance: formatKm(session.actualDistanceKm),
      pace: session.actualPace || empty,
      duration: formatShareDuration(session.actualDurationSec, empty),
      avgHr: session.actualAvgHeartRate
        ? `${session.actualAvgHeartRate} ${t("common:units.bpm")}`
        : empty,
    };

    const rows: { key: string; label: string; planned: string; executed: string }[] =
      [
        {
          key: "distance",
          label: t("share:metrics.distance"),
          planned: planned.distance,
          executed: executed.distance,
        },
        {
          key: "pace",
          label: t("share:metrics.pace"),
          planned: planned.pace,
          executed: executed.pace,
        },
        {
          key: "duration",
          label: t("share:metrics.duration"),
          planned: planned.duration,
          executed: executed.duration,
        },
        {
          key: "avg_hr",
          label: t("share:metrics.avg_hr"),
          planned: planned.avgHr,
          executed: executed.avgHr,
        },
      ];

    return (
      <View ref={ref} collapsable={false} style={[styles.card, style]}>
        {/* Header band */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerKicker}>{t("share:card_title")}</Text>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPillText}>
                {isDone ? t("share:status_done") : t("share:status_planned")}
              </Text>
            </View>
          </View>
          <Text style={styles.sessionTitle} numberOfLines={2}>
            {session.title}
          </Text>
          <Text style={styles.sessionMeta} numberOfLines={1}>
            {session.category}
            {session.fullDateLabel ? ` • ${session.fullDateLabel}` : ""}
          </Text>
        </View>

        {/* Planned vs executed grid */}
        <View style={styles.body}>
          <View style={styles.columnHeaderRow}>
            <Text style={styles.columnHeaderLabel}>
              {t("share:card_subtitle")}
            </Text>
            <Text style={styles.columnHeaderCell}>{t("share:planned")}</Text>
            <Text style={styles.columnHeaderCell}>{t("share:executed")}</Text>
          </View>

          {rows.map((row, index) => (
            <View
              key={row.key}
              style={[
                styles.metricRow,
                index === rows.length - 1 && styles.metricRowLast,
              ]}
            >
              <Text style={styles.metricLabel}>{row.label}</Text>
              <Text style={styles.metricPlanned}>{row.planned}</Text>
              <Text style={styles.metricExecuted}>{row.executed}</Text>
            </View>
          ))}

          <Text style={styles.footer}>{t("share:footer")}</Text>
        </View>
      </View>
    );
  },
);

SessionShareCard.displayName = "SessionShareCard";

const styles = StyleSheet.create({
  card: {
    width: 340,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xxl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.cardHover,
  },
  header: {
    backgroundColor: Colors.darkBg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerKicker: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    letterSpacing: 1,
    color: Colors.primaryLight,
    textTransform: "uppercase",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  statusPillText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textWhite,
  },
  sessionTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: "800",
    color: Colors.textWhite,
    marginBottom: 4,
  },
  sessionMeta: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  columnHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: Spacing.sm,
  },
  columnHeaderLabel: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  columnHeaderCell: {
    width: 92,
    textAlign: "right",
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  metricRowLast: {
    borderBottomWidth: 0,
  },
  metricLabel: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  metricPlanned: {
    width: 92,
    textAlign: "right",
    fontSize: Typography.sizes.base,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  metricExecuted: {
    width: 92,
    textAlign: "right",
    fontSize: Typography.sizes.base,
    fontWeight: "800",
    color: Colors.primary,
  },
  footer: {
    marginTop: Spacing.lg,
    textAlign: "center",
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
});
