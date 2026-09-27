import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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
import { HeartRateZoneBar } from "../../src/components/calendar/HeartRateZoneBar";
import { EffortStructure } from "../../src/components/calendar/EffortStructure";
import { useApp } from "../../src/context/AppContext";
import {
  getDaysOfWeek,
  getMonthGrid,
  getMonthTitle,
  getPrevMonth,
  getNextMonth,
} from "../../src/utils/dateUtils";

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    user,
    workouts,
    monthWorkouts,
    selectedDay,
    selectedDateKey,
    selectedWorkout,
    activeWeek,
    activeMonth,
    activeYear,
    isLoading,
    setSelectedDay,
    setActiveWeek,
    setActiveMonth,
    refreshAllData,
  } = useApp();

  const [isMonthExpanded, setIsMonthExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isChangingWeek, setIsChangingWeek] = useState(false);

  // Dynamic 7 days of the active week
  const weekCalendarDays = getDaysOfWeek(activeYear, activeWeek);

  // Month grid for the active month
  const monthGridData = getMonthGrid(activeYear, activeMonth);

  const currentSession = selectedWorkout;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAllData();
    setRefreshing(false);
  };

  // Handle month navigation in expanded mode
  const handlePrevMonth = async () => {
    const prev = getPrevMonth(activeMonth, activeYear);
    await setActiveMonth(prev.month, prev.year);
  };

  const handleNextMonth = async () => {
    const next = getNextMonth(activeMonth, activeYear);
    await setActiveMonth(next.month, next.year);
  };

  const handleWeekChange = async (newWeek: number) => {
    try {
      setIsChangingWeek(true);
      await setActiveWeek(newWeek);
    } finally {
      setIsChangingWeek(false);
    }
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
          <Text style={styles.headerSubtitle}>TON PLAN D'ENTRAÎNEMENT</Text>
          <TouchableOpacity
            style={styles.monthSelectorBtn}
            onPress={() => setIsMonthExpanded(!isMonthExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.headerTitle}>
              {getMonthTitle(activeMonth, activeYear)}
            </Text>
            <Feather
              name={isMonthExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push("/(tabs)/profile")}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{user?.initials || "ML"}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Calendar Card (Week strip & expandable Month grid) */}
      <Card style={styles.calendarCard}>
        {/* Card Header: Week number + Prev/Next buttons */}
        <View style={styles.calendarHeaderRow}>
          <View style={styles.weekTitleRow}>
            <Text style={styles.weekLabel}>Semaine {activeWeek}</Text>
            {isChangingWeek && (
              <ActivityIndicator size="small" color={Colors.primary} />
            )}
          </View>
          <View style={styles.weekArrowsRow}>
            <TouchableOpacity
              style={styles.arrowBtn}
              activeOpacity={0.7}
              disabled={isChangingWeek}
              onPress={() => handleWeekChange(Math.max(activeWeek - 1, 1))}
            >
              <Feather
                name="chevron-left"
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrowBtn}
              activeOpacity={0.7}
              disabled={isChangingWeek}
              onPress={() => handleWeekChange(Math.min(activeWeek + 1, 52))}
            >
              <Feather
                name="chevron-right"
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Week Strip */}
        <View style={styles.weekStripRow}>
          {weekCalendarDays.map((item) => {
            const isSelected =
              selectedDateKey === item.dateKey ||
              (selectedDay === item.dayNumber && item.month === activeMonth);

            const session = workouts.find((w) => w.dateKey === item.dateKey);
            const isDone = session?.status === "done";
            const isRest = session?.isRestDay || session?.status === "rest";

            return (
              <TouchableOpacity
                key={item.dateKey}
                style={[styles.dayCol, isSelected && styles.dayColSelected]}
                onPress={() =>
                  setSelectedDay(item.dayNumber, item.month, item.year)
                }
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayNameText,
                    isSelected && styles.dayNameTextSelected,
                  ]}
                >
                  {item.dayName}
                </Text>
                <Text
                  style={[
                    styles.dayNumberText,
                    isSelected && styles.dayNumberTextSelected,
                  ]}
                >
                  {item.dayNumber}
                </Text>

                {/* Status indicator under the date */}
                <View style={styles.dayStatusContainer}>
                  {isSelected ? (
                    <View style={styles.selectedWhiteDot} />
                  ) : isDone ? (
                    <Feather name="check" size={14} color={Colors.success} />
                  ) : isRest ? (
                    <Text style={styles.dashText}>—</Text>
                  ) : (
                    <View style={styles.upcomingDot} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Expandable Month Grid (Shown when user toggles) */}
        {isMonthExpanded && (
          <View style={styles.monthContainer}>
            <View style={styles.monthDivider} />

            {/* Month navigation bar inside month grid */}
            <View style={styles.monthNavBar}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={handlePrevMonth}
                activeOpacity={0.7}
              >
                <Feather
                  name="chevron-left"
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>

              <Text style={styles.monthNavTitle}>
                {monthGridData.monthTitle}
              </Text>

              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={handleNextMonth}
                activeOpacity={0.7}
              >
                <Feather
                  name="chevron-right"
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Days of week letters */}
            <View style={styles.monthDaysOfWeekRow}>
              {["L", "M", "M", "J", "V", "S", "D"].map((d, index) => (
                <Text key={index} style={styles.monthDayLetter}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Month grid */}
            <View style={styles.monthGrid}>
              {Array.from({ length: monthGridData.leadingBlanks }).map(
                (_, i) => (
                  <View key={`blank-${i}`} style={styles.monthGridCell} />
                ),
              )}

              {monthGridData.days.map((cell) => {
                const isSelected = selectedDateKey === cell.dateKey;
                const session = monthWorkouts[cell.dateKey];
                const isDone = session?.status === "done";
                const isUpcoming =
                  session && !session.isRestDay && session.status !== "done";

                return (
                  <TouchableOpacity
                    key={cell.dateKey}
                    style={styles.monthGridCell}
                    onPress={() =>
                      setSelectedDay(cell.dayNumber, cell.month, cell.year)
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.monthDateNumberCircle,
                        isSelected && styles.monthDateNumberCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthDateText,
                          isSelected && styles.monthDateTextSelected,
                        ]}
                      >
                        {cell.dayNumber}
                      </Text>
                    </View>

                    {/* Status dot in month view */}
                    <View style={styles.monthDotSlot}>
                      {isDone && !isSelected && (
                        <View
                          style={[
                            styles.dotMarker,
                            { backgroundColor: Colors.success },
                          ]}
                        />
                      )}
                      {isUpcoming && !isSelected && (
                        <View
                          style={[
                            styles.dotMarker,
                            { backgroundColor: Colors.primary },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: Colors.success },
                  ]}
                />
                <Text style={styles.legendText}>Réalisée</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: Colors.primary },
                  ]}
                />
                <Text style={styles.legendText}>À venir</Text>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* 3. Selected Day Session Section Header */}
      <View style={styles.sessionSectionHeader}>
        <Text style={styles.sessionDateHeader}>
          {currentSession?.fullDateLabel || `JOUR ${selectedDay}`}
        </Text>
        <View style={styles.sessionStatusRow}>
          <Text style={styles.sessionSectionTitle}>Séance au programme</Text>
          <View style={styles.upcomingBadgePill}>
            {currentSession?.status === "done" ? (
              <>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: Colors.success },
                  ]}
                />
                <Text
                  style={[
                    styles.upcomingBadgeText,
                    { color: Colors.successText },
                  ]}
                >
                  Réalisée
                </Text>
              </>
            ) : currentSession?.isRestDay ? (
              <>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: Colors.textMuted },
                  ]}
                />
                <Text style={styles.upcomingBadgeText}>Repos</Text>
              </>
            ) : (
              <>
                <View style={styles.orangeDot} />
                <Text style={styles.upcomingBadgeText}>À venir</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* 4. Session Detail Card */}
      <Card style={styles.sessionCard}>
        {/* Top category & title */}
        <View style={styles.sessionTopRow}>
          <View style={styles.sessionIconBox}>
            <MaterialCommunityIcons
              name={currentSession?.isRestDay ? "sleep" : "heart-pulse"}
              size={24}
              color={Colors.primary}
            />
          </View>
          <View style={styles.sessionCategoryBox}>
            <Text style={styles.sessionCategoryText}>
              {currentSession?.category || "SÉANCE QUALITATIVE"}
            </Text>
            <Text style={styles.sessionTitle}>
              {currentSession?.title || "Sortie Seuil & Allure Cible"}
            </Text>
          </View>
        </View>

        {/* 3 Metrics Row */}
        {!currentSession?.isRestDay && (
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Feather name="clock" size={18} color={Colors.textSecondary} />
              <Text style={styles.metricValue}>
                {currentSession?.duration || "1h15"}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <MaterialCommunityIcons
                name="run"
                size={20}
                color={Colors.textSecondary}
              />
              <Text style={styles.metricValue}>
                {currentSession?.distance || "14 km"}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Feather
                name="trending-up"
                size={18}
                color={Colors.textSecondary}
              />
              <Text style={styles.metricValue}>
                {currentSession?.targetPace || "4:50/km"}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.cardDivider} />

        {/* Effort Structure */}
        {currentSession?.effortBlocks && (
          <EffortStructure blocks={currentSession.effortBlocks} />
        )}

        <View style={styles.cardDivider} />

        {/* Target Heart Rate Zone */}
        {currentSession && !currentSession.isRestDay && (
          <HeartRateZoneBar
            label={currentSession.targetZoneLabel}
            bpm={currentSession.targetZoneBpm}
            pinPositionPercent={currentSession.pinPositionPercent}
            segments={currentSession.targetZoneSegments}
          />
        )}

        {/* AI Note */}
        {currentSession?.aiAdjustmentNote && (
          <View style={styles.sessionAiNoteBox}>
            <Ionicons name="sparkles" size={16} color={Colors.primary} />
            <Text style={styles.sessionAiNoteText}>
              {currentSession.aiAdjustmentNote}
            </Text>
          </View>
        )}
      </Card>

      {/* 5. Coach Adapter Card (Besoin d'adapter ?) */}
      <Card variant="peach" style={styles.adaptCard}>
        <View style={styles.adaptHeaderRow}>
          <View style={styles.adaptIconCircle}>
            <Ionicons name="chatbubble" size={22} color={Colors.textWhite} />
          </View>
          <View style={styles.adaptHeaderTextCol}>
            <Text style={styles.adaptTitle}>Besoin d'adapter ?</Text>
            <Text style={styles.adaptSubtitle}>
              Un imprévu, fatigue ou manque de temps ?
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.adaptButton}
          activeOpacity={0.88}
          onPress={() => router.push("/chat" as any)}
        >
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={Colors.textWhite}
          />
          <Text style={styles.adaptButtonText}>
            Discuter avec le coach pour adapter
          </Text>
        </TouchableOpacity>

        <Text style={styles.adaptFooterCaption}>
          L'IA rééquilibre ta semaine en langage naturel.
        </Text>
      </Card>
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
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  monthSelectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.md,
    fontWeight: "800",
  },

  // 2. Calendar Card
  calendarCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  weekTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weekLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  weekArrowsRow: {
    flexDirection: "row",
    gap: 6,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.badgeGray,
    alignItems: "center",
    justifyContent: "center",
  },

  // Week strip
  weekStripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayCol: {
    width: 42,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
  },
  dayColSelected: {
    backgroundColor: Colors.primary,
    ...Shadows.buttonAccent,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  dayNameTextSelected: {
    color: Colors.textWhite,
  },
  dayNumberText: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  dayNumberTextSelected: {
    color: Colors.textWhite,
  },
  dayStatusContainer: {
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dashText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  upcomingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#94A3B8",
  },
  selectedWhiteDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.textWhite,
  },

  // Month grid
  monthContainer: {
    marginTop: Spacing.md,
  },
  monthDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  monthNavBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  monthNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.badgeGray,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  monthDaysOfWeekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.sm,
  },
  monthDayLetter: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    width: 38,
    textAlign: "center",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  monthGridCell: {
    width: "14.28%",
    alignItems: "center",
    paddingVertical: 6,
  },
  monthDateNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  monthDateNumberCircleSelected: {
    backgroundColor: Colors.primary,
  },
  monthDateText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  monthDateTextSelected: {
    color: Colors.textWhite,
    fontWeight: "800",
  },
  monthDotSlot: {
    height: 6,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dotMarker: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xl,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },

  // 3. Session Section Header
  sessionSectionHeader: {
    marginBottom: Spacing.md,
  },
  sessionDateHeader: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sessionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionSectionTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  upcomingBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  orangeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  upcomingBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  // 4. Session Detail Card
  sessionCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sessionIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCategoryBox: {
    flex: 1,
  },
  sessionCategoryText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  sessionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricValue: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  sessionAiNoteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  sessionAiNoteText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
    fontWeight: "500",
  },

  // 5. Adapt Card
  adaptCard: {
    marginBottom: Spacing.xl,
  },
  adaptHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  adaptIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.subtle,
  },
  adaptHeaderTextCol: {
    flex: 1,
  },
  adaptTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  adaptSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  adaptButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: Spacing.md,
    ...Shadows.buttonAccent,
  },
  adaptButtonText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.base,
    fontWeight: "700",
  },
  adaptFooterCaption: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
});
