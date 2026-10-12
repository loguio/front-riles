import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
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
  formatDateKey,
  getWeekNumber,
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
    setSelectedDay,
    setActiveWeek,
    setActiveMonth,
    refreshAllData,
  } = useApp();

  const [isMonthExpanded, setIsMonthExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isChangingWeek, setIsChangingWeek] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setSelectedActivityId(null);
  }, [selectedDateKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const currentWeek = getWeekNumber(today);
  const todayDateKey = formatDateKey(currentYear, currentMonth, currentDay);

  const isViewingToday =
    selectedDateKey === todayDateKey &&
    activeWeek === currentWeek &&
    activeYear === currentYear;

  const handleSnapToToday = async () => {
    try {
      setIsChangingWeek(true);
      await setActiveWeek(currentWeek, currentYear);
      await setSelectedDay(currentDay, currentMonth, currentYear);
    } finally {
      setIsChangingWeek(false);
    }
  };

  const formatDurationSec = (sec?: number, fallback?: string): string => {
    if (!sec || sec <= 0) return fallback || "—";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}h${String(m).padStart(2, "0")}`;
    }
    return s > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${m} min`;
  };

  // Dynamic 7 days of the active week
  const weekCalendarDays = getDaysOfWeek(activeYear, activeWeek);

  // Month grid for the active month
  const monthGridData = getMonthGrid(activeYear, activeMonth);

  const currentSession = selectedWorkout;
  const selectedDayMeta = weekCalendarDays.find(
    (d) =>
      d.dateKey === selectedDateKey ||
      (d.dayNumber === selectedDay && d.month === activeMonth),
  );

  // Détection des activités hors prépa (vélotaf / Déplacement - Transport / Randonnée / Marche)
  const checkIsCommute = (actOrWorkout: any): boolean => {
    if (!actOrWorkout) return false;
    if (actOrWorkout.isCommute === true) return true;
    const cat = String(actOrWorkout.category || "").toLowerCase();
    const title = String(actOrWorkout.title || "").toLowerCase();
    const sport = String(actOrWorkout.sportType || "").toLowerCase();
    return (
      sport.includes("hike") ||
      sport.includes("walk") ||
      sport.includes("ebike") ||
      cat.includes("déplacement") ||
      cat.includes("deplacement") ||
      cat.includes("transport") ||
      cat.includes("vélotaf") ||
      cat.includes("velotaf") ||
      cat.includes("rando") ||
      cat.includes("marche") ||
      title.includes("déplacement") ||
      title.includes("deplacement") ||
      title.includes("transport") ||
      title.includes("vélotaf") ||
      title.includes("velotaf") ||
      title.includes("trajet") ||
      title.includes("boulot") ||
      title.includes("travail") ||
      title.includes("aller-retour") ||
      title.includes("rando") ||
      title.includes("randonnée") ||
      title.includes("randonnee") ||
      title.includes("balade") ||
      title.includes("marche") ||
      title.includes("promenade") ||
      title.includes("cascade") ||
      title.includes("gorge")
    );
  };

  // Calcul du bilan kilométrique de la semaine active (Course à pied uniquement)
  const isRunningSession = (w?: any): boolean => {
    if (!w || w.isRestDay) return false;
    if (checkIsCommute(w)) return false;
    const cat = (w.category || "").toLowerCase();
    const title = (w.title || "").toLowerCase();
    if (
      cat.includes("vélo") ||
      cat.includes("cycl") ||
      title.includes("ride") ||
      title.includes("vélo")
    ) {
      return false;
    }
    if (w.sportType) return w.sportType === "running";
    return true;
  };

  const activeWeekWorkouts = weekCalendarDays.map(
    (d) =>
      monthWorkouts?.[d.dateKey] ||
      workouts.find((w) => w.dateKey === d.dateKey),
  );

  const activeWeekDoneKm = activeWeekWorkouts.reduce((sum: number, w: any) => {
    let dayKm = isRunningSession(w) ? (w?.actualDistanceKm || 0) : 0;
    if (Array.isArray(w?.secondaryActivities)) {
      for (const sec of w.secondaryActivities) {
        if (sec.sportType === "running" && !checkIsCommute(sec)) {
          dayKm += sec.distanceKm || 0;
        }
      }
    }
    return sum + dayKm;
  }, 0);
  const activeWeekPlannedKm = activeWeekWorkouts.reduce((sum: number, w: any) => {
    if (isRunningSession(w) && w?.distance) {
      const parsed = parseFloat(
        w.distance.replace(",", ".").replace(/[^0-9.]/g, ""),
      );
      return sum + (isNaN(parsed) ? 0 : parsed);
    }
    return sum;
  }, 0);

  const isPastWeek =
    activeYear < currentYear ||
    (activeYear === currentYear && activeWeek < currentWeek);

  // Normalisation de toutes les activités de la journée sélectionnée (principale + secondaires)
  const primaryIsRide = Boolean(
    currentSession?.sportType === "cycling" ||
      currentSession?.category?.toLowerCase().includes("vélo") ||
      currentSession?.category?.toLowerCase().includes("vélotaf") ||
      currentSession?.title?.toLowerCase().includes("ride") ||
      currentSession?.title?.toLowerCase().includes("vélo"),
  );

  const primaryActivity = currentSession
    ? {
        id: currentSession.id || "primary",
        dateKey: currentSession.dateKey,
        title: currentSession.title,
        category: currentSession.category,
        sportType:
          currentSession.sportType || (primaryIsRide ? "cycling" : "running"),
        isCommute: checkIsCommute(currentSession),
        distanceKm:
          currentSession.actualDistanceKm ??
          (parseFloat(
            currentSession.distance
              ?.replace(",", ".")
              .replace(/[^0-9.]/g, "") || "0",
          ) ||
            0),
        durationSec: currentSession.actualDurationSec || 0,
        durationLabel:
          currentSession.actualDurationSec &&
          currentSession.actualDurationSec > 0
            ? formatDurationSec(
                currentSession.actualDurationSec,
                currentSession.duration,
              )
            : currentSession.duration,
        distanceLabel:
          currentSession.status === "done" &&
          currentSession.actualDistanceKm !== undefined
            ? `${currentSession.actualDistanceKm.toFixed(1).replace(".", ",")} km`
            : currentSession.distance,
        paceOrSpeedLabel:
          currentSession.actualPace ||
          (primaryIsRide ? "Allure libre" : currentSession.targetPace) ||
          "—",
        actualAvgHeartRate: currentSession.actualAvgHeartRate,
        actualMaxHeartRate: currentSession.actualMaxHeartRate,
        actualElevationGain: currentSession.actualElevationGain,
        actualCalories: currentSession.actualCalories,
        actualCadence: currentSession.actualCadence,
        tss: currentSession.tss,
        sourceProvider: currentSession.sourceProvider,
        status: currentSession.status,
        isRestDay: currentSession.isRestDay,
        isPrimary: true,
        effortBlocks: currentSession.effortBlocks,
        targetZoneLabel: currentSession.targetZoneLabel,
        targetZoneBpm: currentSession.targetZoneBpm,
        pinPositionPercent: currentSession.pinPositionPercent,
        targetZoneSegments: currentSession.targetZoneSegments,
        aiAdjustmentNote: currentSession.aiAdjustmentNote,
      }
    : null;

  const secondaryActivitiesList = (
    currentSession?.secondaryActivities || []
  ).map((sec, idx) => {
    const isSecCommute = checkIsCommute(sec);
    const isSecRide =
      sec.sportType === "cycling" ||
      sec.title?.toLowerCase().includes("ride") ||
      sec.title?.toLowerCase().includes("vélo");
    return {
      id: sec.id || `sec-${idx}`,
      dateKey: currentSession?.dateKey,
      title: sec.title,
      category:
        sec.category ||
        (isSecCommute
          ? "DÉPLACEMENT - TRANSPORT"
          : isSecRide
            ? "SORTIE VÉLO STRAVA"
            : "SÉANCE STRAVA"),
      sportType: sec.sportType || (isSecRide ? "cycling" : "running"),
      isCommute: isSecCommute,
      distanceKm: sec.distanceKm || 0,
      durationSec: sec.durationSec || 0,
      durationLabel: sec.durationLabel || formatDurationSec(sec.durationSec),
      distanceLabel:
        sec.distanceKm > 0
          ? `${sec.distanceKm.toFixed(1).replace(".", ",")} km`
          : "—",
      paceOrSpeedLabel:
        sec.paceOrSpeedLabel || (isSecRide ? "Allure libre" : "—"),
      actualAvgHeartRate: sec.actualAvgHeartRate,
      actualMaxHeartRate: sec.actualMaxHeartRate,
      actualElevationGain: sec.actualElevationGain,
      actualCalories: sec.actualCalories,
      actualCadence: sec.actualCadence,
      tss: sec.tss,
      sourceProvider: "strava",
      status: "done" as const,
      isRestDay: false,
      isPrimary: false,
      effortBlocks: undefined,
      targetZoneLabel: undefined,
      targetZoneBpm: undefined,
      pinPositionPercent: undefined,
      targetZoneSegments: undefined,
      aiAdjustmentNote: isSecCommute
        ? undefined
        : `Deuxième séance synchronisée depuis Strava (${sec.distanceKm ? `${sec.distanceKm.toFixed(1).replace(".", ",")} km` : ""})${sec.actualAvgHeartRate ? ` • ${sec.actualAvgHeartRate} bpm moy` : ""}${sec.tss ? ` • Charge : ${sec.tss} TSS` : ""}.`,
    };
  });

  const allDayActivities = primaryActivity
    ? [primaryActivity, ...secondaryActivitiesList]
    : [];

  const realPrepActivities = allDayActivities.filter((a) => !a.isCommute);
  const isOnlyNonPrepDay =
    allDayActivities.length > 0 && realPrepActivities.length === 0;

  const defaultActivity =
    realPrepActivities.length > 0
      ? realPrepActivities[0]
      : allDayActivities[0] || null;

  const activeDisplayActivity =
    (selectedActivityId &&
      allDayActivities.find((a) => a.id === selectedActivityId)) ||
    defaultActivity;

  const remainingActivities = allDayActivities.filter(
    (a) => a.id !== activeDisplayActivity?.id,
  );

  const isCycling = Boolean(
    activeDisplayActivity?.sportType === "cycling" ||
      activeDisplayActivity?.category?.toLowerCase().includes("vélo") ||
      activeDisplayActivity?.category?.toLowerCase().includes("vélotaf") ||
      activeDisplayActivity?.category?.toLowerCase().includes("cycl") ||
      activeDisplayActivity?.title?.toLowerCase().includes("ride") ||
      activeDisplayActivity?.title?.toLowerCase().includes("vélo"),
  );

  const isDoneSession = activeDisplayActivity?.status === "done";
  const hasPlannedTargets = Boolean(
    !isCycling &&
      activeDisplayActivity?.sourceProvider !== "strava" &&
      activeDisplayActivity?.status !== "done",
  );

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

  const handleWeekChange = async (newWeek: number, newYear = activeYear) => {
    try {
      setIsChangingWeek(true);
      await setActiveWeek(newWeek, newYear);
    } finally {
      setIsChangingWeek(false);
    }
  };

  const getMaxWeeksInYear = (year: number) => {
    return getWeekNumber(new Date(year, 11, 28));
  };

  const handlePrevWeek = async () => {
    if (activeWeek <= 1) {
      const prevYear = activeYear - 1;
      const prevYearMaxWeeks = getMaxWeeksInYear(prevYear);
      await handleWeekChange(prevYearMaxWeeks, prevYear);
    } else {
      await handleWeekChange(activeWeek - 1, activeYear);
    }
  };

  const handleNextWeek = async () => {
    const maxWeeks = getMaxWeeksInYear(activeYear);
    if (activeWeek >= maxWeeks) {
      await handleWeekChange(1, activeYear + 1);
    } else {
      await handleWeekChange(activeWeek + 1, activeYear);
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

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.generatePlanPill}
            onPress={() => router.push("/roadmap" as any)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="map-marker-path"
              size={15}
              color={Colors.primary}
            />
            <Text style={styles.generatePlanPillText}>Roadmap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoGlossaryBtn}
            onPress={() => setShowGlossaryModal(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="info" size={19} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{user?.initials || "ML"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Calendar Card (Week strip & expandable Month grid) */}
      <Card style={styles.calendarCard}>
        {/* Card Header: Week number + Prev/Next buttons */}
        <View style={styles.calendarHeaderRow}>
          <View style={styles.weekTitleRow}>
            <Text style={styles.weekLabel}>Semaine {activeWeek}</Text>

            {/* Bilan kilométrique épuré de la semaine */}
            <View style={styles.weekMileageBadge}>
              <MaterialCommunityIcons
                name="run-fast"
                size={13}
                color={Colors.primary}
              />
              <Text style={styles.weekMileageText}>
                {isPastWeek || activeWeekPlannedKm <= 0
                  ? `${activeWeekDoneKm.toFixed(1).replace(".", ",")} km`
                  : `${activeWeekDoneKm.toFixed(1).replace(".", ",")} / ${activeWeekPlannedKm.toFixed(0)} km`}
              </Text>
            </View>
            {!isViewingToday && (
              <TouchableOpacity
                style={styles.todayPillBtn}
                activeOpacity={0.75}
                onPress={handleSnapToToday}
              >
                <Ionicons
                  name="today-outline"
                  size={12}
                  color={Colors.primary}
                />
                <Text style={styles.todayPillText}>Aujourd'hui</Text>
              </TouchableOpacity>
            )}
            {isChangingWeek && (
              <ActivityIndicator size="small" color={Colors.primary} />
            )}
          </View>
          <View style={styles.weekArrowsRow}>
            <TouchableOpacity
              style={styles.arrowBtn}
              activeOpacity={0.7}
              disabled={isChangingWeek}
              onPress={handlePrevWeek}
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
              onPress={handleNextWeek}
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
            const isCommuteOnly = Boolean(
              session &&
                checkIsCommute(session) &&
                (!session.secondaryActivities ||
                  session.secondaryActivities.every((s: any) =>
                    checkIsCommute(s),
                  )),
            );
            const isDone = session?.status === "done" && !isCommuteOnly;
            const isRest = session?.isRestDay || session?.status === "rest";
            const hasUpcomingWorkout = Boolean(
              session && !isDone && !isRest && !isCommuteOnly,
            );

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
                  ) : hasUpcomingWorkout ? (
                    <View style={styles.upcomingDot} />
                  ) : (
                    <Text style={styles.dashText}>—</Text>
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
                const isCommuteOnly = Boolean(
                  session &&
                    checkIsCommute(session) &&
                    (!session.secondaryActivities ||
                      session.secondaryActivities.every((s: any) =>
                        checkIsCommute(s),
                      )),
                );
                const isDone = session?.status === "done" && !isCommuteOnly;
                const isUpcoming =
                  session &&
                  !session.isRestDay &&
                  session.status !== "done" &&
                  !isCommuteOnly;

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
          {currentSession?.fullDateLabel ||
            selectedDayMeta?.fullDateLabel ||
            `JOUR ${selectedDay}`}
        </Text>
        <View style={styles.sessionStatusRow}>
          <Text style={styles.sessionSectionTitle}>
            {isOnlyNonPrepDay ? "Activités du jour" : "Séance au programme"}
          </Text>
          <View style={styles.upcomingBadgePill}>
            {!currentSession ? (
              <>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: Colors.textMuted },
                  ]}
                />
                <Text style={styles.upcomingBadgeText}>Rien de prévu</Text>
              </>
            ) : isOnlyNonPrepDay ? (
              <>
                <View
                  style={[styles.statusDot, { backgroundColor: "#94A3B8" }]}
                />
                <Text
                  style={[
                    styles.upcomingBadgeText,
                    { color: Colors.textSecondary },
                  ]}
                >
                  Hors prépa
                </Text>
              </>
            ) : activeDisplayActivity?.status === "done" ? (
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
            ) : activeDisplayActivity?.isRestDay ? (
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
      {!currentSession ? (
        <Card style={styles.sessionCard}>
          <View style={styles.sessionTopRow}>
            <View
              style={[
                styles.sessionIconBox,
                { backgroundColor: Colors.badgeGray },
              ]}
            >
              <Feather name="calendar" size={22} color={Colors.textSecondary} />
            </View>
            <View style={styles.sessionCategoryBox}>
              <Text style={styles.sessionCategoryText}>PLANIFICATION</Text>
              <Text style={styles.sessionTitle}>
                Aucune séance prévue pour le moment
              </Text>
            </View>
          </View>
          <Text style={styles.sessionAiNoteText}>
            Il n'y a aucune séance programmée à cette date pour l'instant.
          </Text>
        </Card>
      ) : isOnlyNonPrepDay ? (
        /* CAS A : Journée avec uniquement des activités hors prépa (vélotaf, rando) -> Toutes affichées ensemble en petits bandeaux sans temps ni BPM */
        <Card style={styles.compactNonPrepCard}>
          <View style={styles.compactNonPrepHeader}>
            <Ionicons
              name="layers-outline"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.compactNonPrepHeaderText}>
              AUTRES ACTIVITÉS DU JOUR ({allDayActivities.length})
            </Text>
          </View>

          <View style={styles.compactNonPrepList}>
            {allDayActivities.map((act) => {
              const isRide =
                act.sportType === "cycling" ||
                act.title?.toLowerCase().includes("ride") ||
                act.title?.toLowerCase().includes("vélo");
              const isHike =
                act.sportType?.toLowerCase().includes("hike") ||
                act.title?.toLowerCase().includes("rando");

              return (
                <View key={act.id} style={styles.compactActivityRow}>
                  <View style={styles.compactActivityIconBox}>
                    <MaterialCommunityIcons
                      name={isRide ? "bicycle" : isHike ? "hiking" : "walk"}
                      size={18}
                      color={Colors.textSecondary}
                    />
                  </View>
                  <Text style={styles.compactActivityTitle} numberOfLines={1}>
                    {act.title}
                  </Text>
                  {act.distanceKm > 0 && (
                    <Text style={styles.compactActivityDistance}>
                      {act.distanceKm.toFixed(1).replace(".", ",")} km
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </Card>
      ) : (
        /* CAS B : Carte normale athlétique (Course à pied ou vraie séance vélo / sport d'entraînement) */
        <Card style={styles.sessionCard}>
          {/* Si on affiche une seconde séance permutée */}
          {activeDisplayActivity &&
            realPrepActivities.length > 1 &&
            activeDisplayActivity.id !== realPrepActivities[0]?.id && (
              <View style={styles.activeSecondaryNoticeRow}>
                <View style={styles.swappedBadge}>
                  <Feather name="layers" size={13} color={Colors.primary} />
                  <Text style={styles.swappedBadgeText}>
                    DEUXIÈME SÉANCE DU JOUR
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.resetPrimaryBtn}
                  onPress={() =>
                    setSelectedActivityId(realPrepActivities[0]?.id || null)
                  }
                >
                  <Text style={styles.resetPrimaryBtnText}>
                    Revenir à la 1re
                  </Text>
                  <Feather
                    name="rotate-ccw"
                    size={12}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            )}

          {/* Top category & title */}
          {activeDisplayActivity?.isRestDay ? (
            <View style={styles.restDayContainer}>
              <View style={styles.restDayHeaderRow}>
                <View style={styles.restIconCircle}>
                  <Ionicons
                    name="moon-outline"
                    size={22}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.restHeaderTextCol}>
                  <Text style={styles.restCategory}>
                    RÉCUPÉRATION & ASSIMILATION
                  </Text>
                  <Text style={styles.restTitle}>Jour de repos</Text>
                </View>
              </View>

              <Text style={styles.restPraiseText}>
                Bravo pour tes efforts ! Le repos fait partie intégrante de ton
                entraînement : c'est aujourd'hui que tes fibres musculaires
                s'adaptent et que ton corps recharge ses réserves d'énergie.
              </Text>

              <View style={styles.restPillarsGrid}>
                <View style={styles.restPillarCard}>
                  <Text style={styles.restPillarEmoji}>💧</Text>
                  <Text style={styles.restPillarTitle}>Hydratation</Text>
                  <Text style={styles.restPillarDesc}>
                    2L d'eau pour éliminer les toxines et drainer les fibres.
                  </Text>
                </View>
                <View style={styles.restPillarCard}>
                  <Text style={styles.restPillarEmoji}>🧘</Text>
                  <Text style={styles.restPillarTitle}>Mobilité douce</Text>
                  <Text style={styles.restPillarDesc}>
                    10–15 min d'étirements légers ou marche tranquille.
                  </Text>
                </View>
                <View style={styles.restPillarCard}>
                  <Text style={styles.restPillarEmoji}>🌙</Text>
                  <Text style={styles.restPillarTitle}>Sommeil</Text>
                  <Text style={styles.restPillarDesc}>
                    Vise 8h de sommeil de qualité pour régénérer le système
                    nerveux.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.sessionTopRow}>
              <View style={styles.sessionIconBox}>
                <MaterialCommunityIcons
                  name={isCycling ? "bike" : "heart-pulse"}
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.sessionCategoryBox}>
                <Text style={styles.sessionCategoryText}>
                  {activeDisplayActivity?.category}
                </Text>
                <Text style={styles.sessionTitle}>
                  {activeDisplayActivity?.title}
                </Text>
              </View>
            </View>
          )}

          {/* 3 Metrics Row: adapté au sport */}
          {!activeDisplayActivity?.isRestDay && (
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Feather
                  name="clock"
                  size={18}
                  color={isDoneSession ? Colors.success : Colors.textSecondary}
                />
                <Text style={styles.metricValue}>
                  {activeDisplayActivity?.durationLabel}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <MaterialCommunityIcons
                  name={isCycling ? "bike" : "run"}
                  size={20}
                  color={isDoneSession ? Colors.success : Colors.textSecondary}
                />
                <Text style={styles.metricValue}>
                  {activeDisplayActivity?.distanceLabel}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Feather
                  name={isCycling ? "activity" : "trending-up"}
                  size={18}
                  color={isDoneSession ? Colors.success : Colors.textSecondary}
                />
                <Text style={styles.metricValue}>
                  {activeDisplayActivity?.paceOrSpeedLabel ||
                    (isCycling ? "Allure libre" : "—")}
                </Text>
              </View>
            </View>
          )}

          {/* Encart complet des données réelles de la séance passée (Strava / Garmin / Apple Santé) */}
          {isDoneSession && !activeDisplayActivity?.isRestDay && (
            <View style={styles.realSessionBox}>
              <View style={styles.realSessionHeaderRow}>
                <View style={styles.realSessionTitleRow}>
                  <Feather
                    name="check-circle"
                    size={15}
                    color={Colors.successText}
                  />
                  <Text style={styles.realSessionHeaderTitle}>
                    DONNÉES RÉELLES DE LA SÉANCE
                  </Text>
                </View>
                {activeDisplayActivity?.sourceProvider && (
                  <View style={styles.sourceProviderBadge}>
                    <Text style={styles.sourceProviderText}>
                      {activeDisplayActivity.sourceProvider === "strava"
                        ? "STRAVA"
                        : activeDisplayActivity.sourceProvider === "garmin"
                          ? "GARMIN"
                          : "APPLE SANTÉ"}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.realMetricsGrid}>
                <View style={styles.realMetricCell}>
                  <Text style={styles.realMetricLabel}>Distance réelle</Text>
                  <Text style={styles.realMetricMain}>
                    {activeDisplayActivity?.distanceLabel || "—"}
                  </Text>
                  {hasPlannedTargets ? (
                    <Text style={styles.realMetricSub}>
                      Prévu : {currentSession?.distance || "—"}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.realMetricCell}>
                  <Text style={styles.realMetricLabel}>
                    {isCycling ? "Vitesse moyenne" : "Allure réelle"}
                  </Text>
                  <Text style={styles.realMetricMain}>
                    {activeDisplayActivity?.paceOrSpeedLabel || "—"}
                  </Text>
                  {hasPlannedTargets ? (
                    <Text style={styles.realMetricSub}>
                      Cible : {currentSession?.targetPace || "—"}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.realMetricCell}>
                  <Text style={styles.realMetricLabel}>Cardio mesuré</Text>
                  <Text style={styles.realMetricMain}>
                    {activeDisplayActivity?.actualAvgHeartRate
                      ? `${activeDisplayActivity.actualAvgHeartRate} bpm`
                      : "—"}
                  </Text>
                  <Text style={styles.realMetricSub}>
                    {activeDisplayActivity?.actualMaxHeartRate
                      ? `Max ${activeDisplayActivity.actualMaxHeartRate} bpm`
                      : hasPlannedTargets
                        ? currentSession?.targetZoneBpm || ""
                        : ""}
                  </Text>
                </View>
              </View>

              {(activeDisplayActivity?.actualElevationGain !== undefined ||
                activeDisplayActivity?.actualCadence !== undefined ||
                activeDisplayActivity?.actualCalories !== undefined ||
                activeDisplayActivity?.tss !== undefined) && (
                <View style={styles.realSecondaryRow}>
                  {activeDisplayActivity.actualElevationGain !==
                    undefined && (
                    <Text style={styles.realSecondaryTag}>
                      ⛰️ +{activeDisplayActivity.actualElevationGain} m D+
                    </Text>
                  )}
                  {activeDisplayActivity.actualCadence !== undefined &&
                    !isCycling && (
                      <Text style={styles.realSecondaryTag}>
                        👟 {activeDisplayActivity.actualCadence} spm
                      </Text>
                    )}
                  {activeDisplayActivity.actualCalories !== undefined && (
                    <Text style={styles.realSecondaryTag}>
                      🔥 {activeDisplayActivity.actualCalories} kcal
                    </Text>
                  )}
                  {activeDisplayActivity.tss !== undefined && (
                    <Text style={styles.realSecondaryTag}>
                      ⚡ Charge : {activeDisplayActivity.tss} TSS
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Autres activités du jour (Vélotaf/rando en petit bandeau simple, ou 2e vraie séance cliquable) */}
          {remainingActivities.length > 0 && (
            <View style={styles.secondaryActivitiesBox}>
              <View style={styles.secondaryActivitiesHeaderRow}>
                <Ionicons
                  name="layers-outline"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.secondaryActivitiesHeaderTitle}>
                  AUTRES ACTIVITÉS DU JOUR ({remainingActivities.length})
                </Text>
              </View>
              {remainingActivities.map((act) => {
                const isActCommute = act.isCommute;
                const isActCycling =
                  act.sportType === "cycling" ||
                  act.title.toLowerCase().includes("ride") ||
                  act.title.toLowerCase().includes("vélo");
                const isActHike =
                  act.sportType.toLowerCase().includes("hike") ||
                  act.title.toLowerCase().includes("rando");

                if (isActCommute) {
                  return (
                    <View key={act.id} style={styles.compactActivityRow}>
                      <View style={styles.compactActivityIconBox}>
                        <MaterialCommunityIcons
                          name={
                            isActCycling
                              ? "bicycle"
                              : isActHike
                                ? "hiking"
                                : "walk"
                          }
                          size={18}
                          color={Colors.textSecondary}
                        />
                      </View>
                      <Text
                        style={styles.compactActivityTitle}
                        numberOfLines={1}
                      >
                        {act.title}
                      </Text>
                      {act.distanceKm > 0 && (
                        <Text style={styles.compactActivityDistance}>
                          {act.distanceKm.toFixed(1).replace(".", ",")} km
                        </Text>
                      )}
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    key={act.id}
                    style={[
                      styles.secondaryActivityRow,
                      styles.secondaryActivityRowInteractive,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => setSelectedActivityId(act.id)}
                  >
                    <View
                      style={[
                        styles.secondaryActivityIconBox,
                        styles.secondaryActivityIconBoxActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={isActCycling ? "bike" : "run"}
                        size={18}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={styles.secondaryActivityContent}>
                      <View style={styles.secondaryActivityTitleRow}>
                        <Text
                          style={styles.secondaryActivityTitle}
                          numberOfLines={1}
                        >
                          {act.title}
                        </Text>
                        <View style={styles.usefulSessionBadge}>
                          <Text style={styles.usefulSessionBadgeText}>
                            {act.isPrimary ? "Séance principale" : "2e séance"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.secondaryActivityMeta}>
                        {act.distanceKm > 0
                          ? `${act.distanceKm.toFixed(1).replace(".", ",")} km • `
                          : ""}
                        {act.durationLabel}
                        {act.paceOrSpeedLabel
                          ? ` • ${act.paceOrSpeedLabel}`
                          : ""}
                      </Text>
                    </View>
                    <View style={styles.switchSessionActionBox}>
                      <Text style={styles.switchSessionActionText}>
                        Afficher
                      </Text>
                      <Feather
                        name="arrow-up-right"
                        size={14}
                        color={Colors.primary}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.cardDivider} />

          {/* Effort Structure */}
          {!activeDisplayActivity?.isRestDay &&
            activeDisplayActivity?.effortBlocks &&
            activeDisplayActivity.effortBlocks.length > 0 && (
              <EffortStructure blocks={activeDisplayActivity.effortBlocks} />
            )}

          {!activeDisplayActivity?.isRestDay &&
            activeDisplayActivity?.effortBlocks &&
            activeDisplayActivity.effortBlocks.length > 0 && (
              <View style={styles.cardDivider} />
            )}

          {/* Target Heart Rate Zone */}
          {!activeDisplayActivity?.isRestDay &&
            activeDisplayActivity?.targetZoneSegments &&
            activeDisplayActivity.targetZoneSegments.length > 0 && (
              <HeartRateZoneBar
                label={
                  activeDisplayActivity.targetZoneLabel || "Zone Cardio"
                }
                bpm={
                  isDoneSession && activeDisplayActivity.actualAvgHeartRate
                    ? `${activeDisplayActivity.actualAvgHeartRate} bpm moy (cible ${activeDisplayActivity.targetZoneBpm})`
                    : activeDisplayActivity.targetZoneBpm || ""
                }
                pinPositionPercent={
                  activeDisplayActivity.pinPositionPercent || 50
                }
                segments={activeDisplayActivity.targetZoneSegments}
              />
            )}

          {/* Session Note */}
          {activeDisplayActivity?.aiAdjustmentNote && (
            <View style={styles.sessionAiNoteBox}>
              <Feather name="info" size={15} color={Colors.primary} />
              <Text style={styles.sessionAiNoteText}>
                {activeDisplayActivity.aiAdjustmentNote}
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* 5. Coach Card (Accès direct & contextuel au coach) */}
      <Card variant="peach" style={styles.adaptCard}>
        <View style={styles.adaptHeaderRow}>
          <View style={styles.adaptIconCircle}>
            <Ionicons name="chatbubble" size={22} color={Colors.textWhite} />
          </View>
          <View style={styles.adaptHeaderTextCol}>
            <Text style={styles.adaptTitle}>Échanger avec ton coach</Text>
            <Text style={styles.adaptSubtitle}>
              Une question sur une séance, un imprévu, une fatigue ou envie
              d'adapter ton plan : parle directement à ton coach.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.adaptButton}
          activeOpacity={0.88}
          onPress={() =>
            router.push({
              pathname: "/chat",
              params: {
                from: "calendar",
                dateKey:
                  activeDisplayActivity?.dateKey ||
                  currentSession?.dateKey ||
                  selectedDateKey,
                workoutTitle:
                  activeDisplayActivity?.title ||
                  currentSession?.title ||
                  (activeDisplayActivity?.isRestDay
                    ? "Jour de repos"
                    : undefined),
              },
            } as any)
          }
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={20}
            color={Colors.textWhite}
          />
          <Text style={styles.adaptButtonText}>Parler au coach</Text>
        </TouchableOpacity>

        <Text style={styles.adaptFooterCaption}>
          Le coach analyse ton contexte et rééquilibre ton entraînement à la
          demande.
        </Text>
      </Card>

      {/* 6. Modal Lexique & Métriques Sportives (TSS, SPM, Z2, Seuil, Allure) */}
      <Modal
        visible={showGlossaryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGlossaryModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.modalTitle}>Lexique & Métriques Sportives</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowGlossaryModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* TSS */}
              <View style={styles.glossaryItem}>
                <View style={styles.glossaryBadge}>
                  <Text style={styles.glossaryBadgeText}>TSS</Text>
                </View>
                <Text style={styles.glossaryTermTitle}>
                  Training Stress Score (Charge d'effort)
                </Text>
                <Text style={styles.glossaryDefinition}>
                  Indicateur qui mesure la fatigue et l'impact réel d'une séance sur ton organisme, en combinant la durée et l'intensité cardio. Plus le score est élevé, plus ton corps a besoin de récupérer (ex: footing cool = 30-40 TSS, séance intense ou sortie longue = 80-120+ TSS).
                </Text>
              </View>

              {/* SPM */}
              <View style={styles.glossaryItem}>
                <View style={styles.glossaryBadge}>
                  <Text style={styles.glossaryBadgeText}>SPM</Text>
                </View>
                <Text style={styles.glossaryTermTitle}>
                  Cadence (Pas par minute)
                </Text>
                <Text style={styles.glossaryDefinition}>
                  La fréquence de tes foulées en course à pied. Une cadence fluide se situe généralement entre 165 et 180 pas par minute. Une bonne cadence protège les articulations et réduit l'impact au sol.
                </Text>
              </View>

              {/* Z2 */}
              <View style={styles.glossaryItem}>
                <View style={styles.glossaryBadge}>
                  <Text style={styles.glossaryBadgeText}>Z2</Text>
                </View>
                <Text style={styles.glossaryTermTitle}>
                  Endurance Fondamentale
                </Text>
                <Text style={styles.glossaryDefinition}>
                  L'allure reine de 80% de ton volume d'entraînement. C'est une intensité où tu peux respirer facilement et discuter sans être essoufflé. Elle apprend à ton corps à brûler les graisses et fortifie ton cœur sans fatigue toxique.
                </Text>
              </View>

              {/* SEUIL */}
              <View style={styles.glossaryItem}>
                <View style={styles.glossaryBadge}>
                  <Text style={styles.glossaryBadgeText}>Seuil</Text>
                </View>
                <Text style={styles.glossaryTermTitle}>
                  Zones 3–4 (Seuil Lactique)
                </Text>
                <Text style={styles.glossaryDefinition}>
                  L'allure de course "vite mais maîtrisée". C'est l'intensité limite à laquelle tes muscles produisent du lactate à la même vitesse que ton corps peut l'éliminer. Travailler à cette allure recule le mur de fatigue et améliore ta vitesse de croisière.
                </Text>
              </View>

              {/* ALLURE */}
              <View style={styles.glossaryItem}>
                <View style={styles.glossaryBadge}>
                  <Text style={styles.glossaryBadgeText}>Allure</Text>
                </View>
                <Text style={styles.glossaryTermTitle}>
                  Allure min/km
                </Text>
                <Text style={styles.glossaryDefinition}>
                  Le temps en minutes et secondes nécessaire pour parcourir un kilomètre. Contrairement à la vitesse en km/h, l'allure permet de réguler avec précision son effort (ex: 5:00/km correspond à 12,0 km/h, 4:30/km à 13,3 km/h).
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  generatePlanPill: {
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
  generatePlanPillText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.primary,
  },
  planPresentationCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: "#FFF9F7",
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  planPresentationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  planPresentationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  planPresentationBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textWhite,
    letterSpacing: 0.6,
  },
  planPresentationText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
    fontWeight: "500",
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
  todayPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
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
  realSessionBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  realSessionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  realSessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  realSessionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.successText,
    letterSpacing: 0.6,
  },
  sourceProviderBadge: {
    backgroundColor: "#065F46",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  sourceProviderText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.textWhite,
    letterSpacing: 0.5,
  },
  realMetricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  realMetricCell: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  realMetricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  realMetricMain: {
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  realMetricSub: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  realSecondaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: Spacing.sm,
  },
  realSecondaryTag: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.successText,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
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

  // Info Glossary & Week Mileage Badge
  infoGlossaryBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  weekMileageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  weekMileageText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },

  // Rest Day Positive Styling
  restDayContainer: {
    paddingBottom: Spacing.xs,
  },
  restDayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  restIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  restHeaderTextCol: {
    flex: 1,
  },
  restCategory: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  restTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  restPraiseText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
    fontWeight: "500",
  },
  restPillarsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  restPillarCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  restPillarEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  restPillarTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 2,
    textAlign: "center",
  },
  restPillarDesc: {
    fontSize: 9.5,
    color: Colors.textSecondary,
    lineHeight: 13,
    textAlign: "center",
  },

  // Secondary Activities (Vélotaf, etc.)
  secondaryActivitiesBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  secondaryActivitiesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  secondaryActivitiesHeaderTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  secondaryActivityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryActivityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.badgeGray,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActivityContent: {
    flex: 1,
  },
  secondaryActivityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  secondaryActivityTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  commuteBadge: {
    backgroundColor: Colors.badgeGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  commuteBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  secondaryActivityMeta: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  // Mode Gris (Vélotaf / Déplacements seuls)
  sessionCardGray: {
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sessionIconBoxGray: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCategoryTextGray: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.6,
  },
  sessionTitleGray: {
    fontSize: 19,
    fontWeight: "800",
    color: "#334155",
  },
  commuteBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  commuteHeaderBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  commuteHeaderBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  metricsRowGray: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricValueGray: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: "#475569",
  },
  commuteTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Spacing.md,
  },
  commuteTag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  commuteNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  commuteNoticeText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: "#64748B",
    lineHeight: 16,
    fontWeight: "500",
  },
  // Permutation & Deuxième séance interactive
  activeSecondaryNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  swappedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swappedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  resetPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetPrimaryBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  secondaryActivityRowGray: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    opacity: 0.88,
  },
  secondaryActivityRowInteractive: {
    backgroundColor: Colors.card,
    borderColor: Colors.primaryBorder,
  },
  secondaryActivityIconBoxGray: {
    backgroundColor: "#E2E8F0",
  },
  secondaryActivityIconBoxActive: {
    backgroundColor: Colors.primaryMuted,
  },
  secondaryActivityTitleGray: {
    color: "#64748B",
  },
  commuteBadgeGray: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  commuteBadgeTextGray: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748B",
  },
  secondaryActivityMetaGray: {
    fontSize: Typography.sizes.xs,
    color: "#94A3B8",
    fontWeight: "500",
  },
  usefulSessionBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  usefulSessionBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: Colors.primary,
  },
  switchSessionActionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginLeft: 6,
  },
  switchSessionActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },

  // Petits bandeaux compacts pour activités hors prépa (Vélotaf, Randonnée, Déplacements)
  compactNonPrepCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.card,
  },
  compactNonPrepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  compactNonPrepHeaderText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  compactNonPrepList: {
    gap: 8,
  },
  compactActivityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  compactActivityIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  compactActivityTitle: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
    color: "#64748B",
  },
  compactActivityDistance: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: "#64748B",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },

  // Modal Lexique
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    maxHeight: "82%",
    ...Shadows.cardHover,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  modalScroll: {
    marginBottom: Spacing.md,
  },
  glossaryItem: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  glossaryBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: 6,
  },
  glossaryBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.primary,
  },
  glossaryTermTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  glossaryDefinition: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
});
