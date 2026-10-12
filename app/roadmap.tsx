import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
} from "../src/constants/theme";
import { Card } from "../src/components/ui/Card";
import { useApp } from "../src/context/AppContext";
import { workoutService, analytics } from "../src/services";

export default function PlanRoadmapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setActiveWeek, setSelectedDateKey } = useApp();

  const [roadmap, setRoadmap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(null);
  const [weekFilter, setWeekFilter] = useState<"all" | "upcoming">("all");

  const loadRoadmap = useCallback(async () => {
    try {
      const data = await workoutService.getPlanRoadmap();
      if (data) {
        setRoadmap(data);
        const currentW = (data.weeklyBreakdown || []).find(
          (w: any) => w.status === "current",
        );
        if (currentW) {
          setExpandedWeekKey(currentW.weekKey);
        } else if (data.weeklyBreakdown?.length > 0) {
          setExpandedWeekKey(data.weeklyBreakdown[0].weekKey);
        }
      }
    } catch (err) {
      console.warn("Failed to load roadmap:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    analytics.trackEvent("plan_roadmap_opened");
    loadRoadmap();
  }, [loadRoadmap]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRoadmap();
    setRefreshing(false);
  }, [loadRoadmap]);

  const handleOpenWeekInCalendar = async (weekNumber: number, year: number) => {
    await setActiveWeek(weekNumber, year);
    router.push("/(tabs)/calendar");
  };

  const handleOpenSessionInCalendar = async (dateKey: string) => {
    await setSelectedDateKey(dateKey);
    router.push("/(tabs)/calendar");
  };

  if (isLoading && !roadmap) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>
          Chargement de ta roadmap de préparation...
        </Text>
      </View>
    );
  }

  const goal = roadmap?.goal || {
    title: user?.activeGoal?.title || "Marathon",
    target: user?.activeGoal?.target || "",
    raceDate: user?.activeGoal?.raceDate || "",
    weeksRemaining: user?.activeGoal?.weeksRemaining || 16,
    totalWeeks: 16,
    currentRelativeWeek: 1,
    progressPercentage: user?.activeGoal?.progressPercentage || 10,
    currentPhaseName: "Phase 1 : Socle Aérobie",
  };

  const paces = roadmap?.calibratedPaces ||
    user?.stravaSixMonthsSummary?.estimatedPaces || {
      easyPaceZ2: "6:20/km – 6:40/km",
      marathonPaceZ3: "5:50/km",
      thresholdPaceZ4: "5:30/km",
      intervalPaceZ5: "5:10/km",
    };

  const stats = roadmap?.summaryStats || {
    totalPlannedKm: 0,
    completedPlanKm: 0,
    totalPlannedSessions: 0,
    avgWeeklyKm: 0,
    peakWeeklyKm: 0,
  };

  const phases: any[] = roadmap?.phases || [];
  const allWeeks: any[] = roadmap?.weeklyBreakdown || [];
  const filteredWeeks =
    weekFilter === "upcoming"
      ? allWeeks.filter((w) => w.status !== "completed")
      : allWeeks;

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. Top Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.75}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
        >
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerSuper}>VISION MACROCYCLE</Text>
          <Text style={styles.headerTitle}>Roadmap du Plan</Text>
        </View>

        <TouchableOpacity
          style={styles.coachPillBtn}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/chat",
              params: {
                from: "roadmap",
                workoutTitle: `Plan ${goal.title}${goal.target ? ` (${goal.target})` : ""}`,
              },
            } as any)
          }
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={15}
            color={Colors.primary}
          />
          <Text style={styles.coachPillBtnText}>Coach</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 28) + Spacing.xl },
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
        {/* 2. Hero Goal & Macro Progression Card */}
        <View style={styles.goalHeroCard}>
          <View style={styles.goalHeroCurve} />

          <View style={styles.goalHeroTopRow}>
            <View style={styles.goalBadgePill}>
              <MaterialCommunityIcons
                name="flag-checkered"
                size={14}
                color={Colors.textWhite}
              />
              <Text style={styles.goalBadgePillText}>
                OBJECTIF • {goal.raceDate || `${goal.weeksRemaining} SEMAINES`}
              </Text>
            </View>
            <View style={styles.weeksLeftPill}>
              <Text style={styles.weeksLeftPillText}>
                S{goal.currentRelativeWeek}/{goal.totalWeeks}
              </Text>
            </View>
          </View>

          <Text style={styles.goalHeroTitle}>
            {goal.title}
            {goal.target ? ` • ${goal.target}` : ""}
          </Text>
          <Text style={styles.goalHeroPhaseText}>{goal.currentPhaseName}</Text>

          {/* Progress Bar */}
          <View style={styles.goalProgressWrapper}>
            <View style={styles.goalProgressLabelsRow}>
              <Text style={styles.goalProgressLabel}>
                Avancement de la préparation
              </Text>
              <Text style={styles.goalProgressPct}>
                {goal.progressPercentage}% ({goal.weeksRemaining} sem. restantes)
              </Text>
            </View>
            <View style={styles.goalProgressTrack}>
              <View
                style={[
                  styles.goalProgressFill,
                  {
                    width: `${Math.max(6, Math.min(100, goal.progressPercentage))}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* 3-Column Summary Cartouche */}
          <View style={styles.goalStatsCartouche}>
            <View style={styles.goalStatCol}>
              <Text style={styles.goalStatLabel}>VOLUME TOTAL</Text>
              <Text style={styles.goalStatValue}>{stats.totalPlannedKm} km</Text>
            </View>
            <View style={styles.goalStatDivider} />
            <View style={styles.goalStatCol}>
              <Text style={styles.goalStatLabel}>MOY. HEBDO</Text>
              <Text style={styles.goalStatValue}>
                ~{stats.avgWeeklyKm} km/s
              </Text>
            </View>
            <View style={styles.goalStatDivider} />
            <View style={styles.goalStatCol}>
              <Text style={styles.goalStatLabel}>PIC SEMAINE</Text>
              <Text style={styles.goalStatValue}>{stats.peakWeeklyKm} km</Text>
            </View>
          </View>
        </View>

        {/* 3. Repères d'Allures Physiologiques Calibrées */}
        <Card style={styles.pacesCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons
                name="speedometer"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.sectionTitle}>
                Allures calibrées sur tes sorties
              </Text>
            </View>
          </View>

          <View style={styles.pacesGrid}>
            <View style={styles.paceBox}>
              <Text style={styles.paceZoneTag}>Z2 • ENDURANCE</Text>
              <Text style={styles.paceValueText}>{paces.easyPaceZ2}</Text>
            </View>
            <View style={styles.paceBox}>
              <Text style={styles.paceZoneTag}>Z3 • SPÉCIFIQUE</Text>
              <Text style={styles.paceValueText}>{paces.marathonPaceZ3}</Text>
            </View>
            <View style={styles.paceBox}>
              <Text style={styles.paceZoneTag}>Z4 • SEUIL</Text>
              <Text style={styles.paceValueText}>{paces.thresholdPaceZ4}</Text>
            </View>
            <View style={styles.paceBox}>
              <Text style={styles.paceZoneTag}>Z5 • VMA</Text>
              <Text style={styles.paceValueText}>{paces.intervalPaceZ5}</Text>
            </View>
          </View>
        </Card>

        {/* 4. Les 4 Phases de la Préparation */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleBlock}>
            <Text style={styles.blockTitle}>Les 4 Phases du Macrocycle</Text>
            <Text style={styles.blockSubtitle}>
              Périodisation progressive avec semaines d'assimilation (3:1)
            </Text>
          </View>

          {phases.map((phase: any) => {
            const isCurrent = phase.status === "current";
            const isCompleted = phase.status === "completed";

            return (
              <Card
                key={phase.phaseNumber}
                style={[
                  styles.phaseCard,
                  isCurrent ? styles.phaseCardCurrent : {},
                ]}
              >
                <View style={styles.phaseTopRow}>
                  <View
                    style={[
                      styles.phaseNumCircle,
                      isCurrent && styles.phaseNumCircleCurrent,
                      isCompleted && styles.phaseNumCircleCompleted,
                    ]}
                  >
                    {isCompleted ? (
                      <Feather name="check" size={14} color={Colors.textWhite} />
                    ) : (
                      <Text
                        style={[
                          styles.phaseNumText,
                          (isCurrent || isCompleted) && {
                            color: Colors.textWhite,
                          },
                        ]}
                      >
                        {phase.phaseNumber}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.phaseTitleAndStatusRow}>
                      <Text style={styles.phaseTitle} numberOfLines={1}>
                        {phase.name}
                      </Text>
                    </View>
                    <Text style={styles.phaseRangeLabel}>
                      {phase.weeksRangeLabel}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.phaseStatusBadge,
                      isCurrent && styles.phaseStatusBadgeCurrent,
                      isCompleted && styles.phaseStatusBadgeCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.phaseStatusBadgeText,
                        isCurrent && styles.phaseStatusBadgeTextCurrent,
                        isCompleted && styles.phaseStatusBadgeTextCompleted,
                      ]}
                    >
                      {isCurrent
                        ? "EN COURS"
                        : isCompleted
                          ? "VALIDÉE"
                          : "À VENIR"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.phaseFocusText}>{phase.focus}</Text>

                <View style={styles.phaseTagsRow}>
                  <View style={styles.phaseTag}>
                    <MaterialCommunityIcons
                      name="map-marker-distance"
                      size={13}
                      color={Colors.primary}
                    />
                    <Text style={styles.phaseTagText}>
                      Moy. {phase.avgKm} km/sem (Pic {phase.peakKm} km)
                    </Text>
                  </View>
                  <View style={styles.phaseTag}>
                    <Feather name="calendar" size={12} color={Colors.primary} />
                    <Text style={styles.phaseTagText}>
                      {phase.sessionsPerWeek} séances / sem
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        {/* 5. Découpage Semaine par Semaine */}
        <View style={styles.sectionBlock}>
          <View style={styles.weeksHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.blockTitle}>Calendrier des Semaines</Text>
              <Text style={styles.blockSubtitle}>
                Touche une semaine pour voir ses séances clés
              </Text>
            </View>

            <View style={styles.filterPillsRow}>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  weekFilter === "all" && styles.filterPillActive,
                ]}
                onPress={() => setWeekFilter("all")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    weekFilter === "all" && styles.filterPillTextActive,
                  ]}
                >
                  Toutes ({allWeeks.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  weekFilter === "upcoming" && styles.filterPillActive,
                ]}
                onPress={() => setWeekFilter("upcoming")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    weekFilter === "upcoming" && styles.filterPillTextActive,
                  ]}
                >
                  À venir
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {filteredWeeks.map((week: any) => {
            const isExpanded = expandedWeekKey === week.weekKey;
            const isCurrent = week.status === "current";
            const isCompleted = week.status === "completed";

            return (
              <Card
                key={week.weekKey}
                style={[
                  styles.weekCard,
                  isCurrent ? styles.weekCardCurrent : {},
                ]}
              >
                <TouchableOpacity
                  style={styles.weekCardHeader}
                  activeOpacity={0.8}
                  onPress={() =>
                    setExpandedWeekKey(isExpanded ? null : week.weekKey)
                  }
                >
                  <View
                    style={[
                      styles.weekNumBadge,
                      isCurrent && styles.weekNumBadgeCurrent,
                      isCompleted && styles.weekNumBadgeCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekNumBadgeText,
                        (isCurrent || isCompleted) && {
                          color: Colors.textWhite,
                        },
                      ]}
                    >
                      S{week.relativeWeek}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.weekTitleRow}>
                      <Text style={styles.weekTypeTitle} numberOfLines={1}>
                        {week.weekType}
                      </Text>
                    </View>
                    <Text style={styles.weekDateSub}>
                      {week.dateRangeLabel} •{" "}
                      {isCurrent
                        ? "Semaine actuelle"
                        : isCompleted
                          ? "Terminée"
                          : week.phaseName.split(":")[0]}
                    </Text>
                  </View>

                  <View style={styles.weekRightMetrics}>
                    <Text style={styles.weekKmText}>
                      {isCompleted
                        ? `${week.completedKm} km`
                        : isCurrent
                          ? `${week.completedKm} / ${week.plannedKm} km`
                          : `${week.plannedKm} km`}
                    </Text>
                    <Text style={styles.weekSessionsSubText}>
                      {week.plannedRunningSessions} séances
                    </Text>
                  </View>

                  <Feather
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={Colors.textSecondary}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.weekExpandedBody}>
                    {week.sessions
                      .filter((s: any) => !s.isRestDay)
                      .map((session: any) => {
                        const isSessionDone = session.status === "done";
                        return (
                          <TouchableOpacity
                            key={session.dateKey}
                            style={styles.weekSessionRow}
                            activeOpacity={0.75}
                            onPress={() =>
                              handleOpenSessionInCalendar(session.dateKey)
                            }
                          >
                            <View style={styles.weekSessionDayBadge}>
                              <Text style={styles.weekSessionDayText}>
                                {session.dayName}
                              </Text>
                              <Text style={styles.weekSessionDayNum}>
                                {session.dayNumber}
                              </Text>
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text
                                style={styles.weekSessionTitle}
                                numberOfLines={1}
                              >
                                {session.title}
                              </Text>
                              <Text style={styles.weekSessionMeta}>
                                {isSessionDone && session.actualDistanceKm
                                  ? `Réalisé : ${Number(session.actualDistanceKm).toFixed(1).replace(".", ",")} km à ${session.actualPace || session.targetPace}`
                                  : `Prévu : ${session.distance} (${session.duration}) • Cible ${session.targetPace}`}
                              </Text>
                            </View>

                            {isSessionDone ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={18}
                                color={Colors.success}
                              />
                            ) : (
                              <Feather
                                name="chevron-right"
                                size={16}
                                color={Colors.textMuted}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}

                    <TouchableOpacity
                      style={styles.openCalendarWeekBtn}
                      activeOpacity={0.85}
                      onPress={() =>
                        handleOpenWeekInCalendar(week.weekNumber, week.year)
                      }
                    >
                      <Feather
                        name="calendar"
                        size={14}
                        color={Colors.primary}
                      />
                      <Text style={styles.openCalendarWeekBtnText}>
                        Ouvrir la Semaine {week.relativeWeek} dans le calendrier
                      </Text>
                      <Feather
                        name="arrow-right"
                        size={14}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            );
          })}
        </View>

        {/* 6. Bottom Coach CTA */}
        <TouchableOpacity
          style={styles.bottomCoachBtn}
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: "/chat",
              params: {
                from: "roadmap",
                workoutTitle: `Plan ${goal.title} (${goal.target})`,
              },
            } as any)
          }
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={20}
            color={Colors.textWhite}
          />
          <Text style={styles.bottomCoachBtnText}>
            Discuter de ma prépa avec le Coach IA
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBox: {
    alignItems: "center",
  },
  headerSuper: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.9,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  coachPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  coachPillBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.primary,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
  },

  // Hero Goal Card
  goalHeroCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    ...Shadows.heroAccent,
  },
  goalHeroCurve: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  goalHeroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  goalBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  goalBadgePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textWhite,
    letterSpacing: 0.6,
  },
  weeksLeftPill: {
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  weeksLeftPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textWhite,
  },
  goalHeroTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: Colors.textWhite,
    marginBottom: 4,
  },
  goalHeroPhaseText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: Spacing.lg,
  },
  goalProgressWrapper: {
    marginBottom: Spacing.lg,
  },
  goalProgressLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  goalProgressLabel: {
    fontSize: Typography.sizes.xs,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "600",
  },
  goalProgressPct: {
    fontSize: Typography.sizes.xs,
    color: Colors.textWhite,
    fontWeight: "800",
  },
  goalProgressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: Colors.textWhite,
  },
  goalStatsCartouche: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
  },
  goalStatCol: {
    flex: 1,
    alignItems: "center",
  },
  goalStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  goalStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.78)",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  goalStatValue: {
    fontSize: Typography.sizes.base,
    fontWeight: "800",
    color: Colors.textWhite,
  },

  // Paces Card
  pacesCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  pacesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paceBox: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paceZoneTag: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  paceValueText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  // Phases Block
  sectionBlock: {
    marginBottom: Spacing.xl,
  },
  sectionTitleBlock: {
    marginBottom: Spacing.md,
  },
  blockTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  blockSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  phaseCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phaseCardCurrent: {
    borderColor: Colors.primary,
    backgroundColor: "#FFFDFB",
  },
  phaseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.sm,
  },
  phaseNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.badgeGray,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseNumCircleCurrent: {
    backgroundColor: Colors.primary,
  },
  phaseNumCircleCompleted: {
    backgroundColor: Colors.success,
  },
  phaseNumText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  phaseTitleAndStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  phaseTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  phaseRangeLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginTop: 1,
  },
  phaseStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.badgeGray,
  },
  phaseStatusBadgeCurrent: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  phaseStatusBadgeCompleted: {
    backgroundColor: "#DCFCE7",
  },
  phaseStatusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  phaseStatusBadgeTextCurrent: {
    color: Colors.primary,
  },
  phaseStatusBadgeTextCompleted: {
    color: Colors.successText,
  },
  phaseFocusText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  phaseTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  phaseTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phaseTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  // Weeks Breakdown
  weeksHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: 8,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.textWhite,
  },
  weekCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekCardCurrent: {
    borderColor: Colors.primary,
    backgroundColor: "#FFFDFB",
  },
  weekCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  weekNumBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.badgeGray,
    alignItems: "center",
    justifyContent: "center",
  },
  weekNumBadgeCurrent: {
    backgroundColor: Colors.primary,
  },
  weekNumBadgeCompleted: {
    backgroundColor: Colors.success,
  },
  weekNumBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  weekTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  weekTypeTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  weekDateSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginTop: 2,
  },
  weekRightMetrics: {
    alignItems: "flex-end",
  },
  weekKmText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
  weekSessionsSubText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  weekExpandedBody: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  weekSessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
  },
  weekSessionDayBadge: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  weekSessionDayText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  weekSessionDayNum: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  weekSessionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  weekSessionMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  openCalendarWeekBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  openCalendarWeekBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.primary,
  },
  bottomCoachBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
    ...Shadows.buttonAccent,
  },
  bottomCoachBtnText: {
    fontSize: Typography.sizes.base,
    fontWeight: "800",
    color: Colors.textWhite,
  },
});
