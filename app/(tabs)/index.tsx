import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
import { Badge } from "../../src/components/ui/Badge";
import { EffortSlider } from "../../src/components/ui/Slider";
import { DashboardSkeleton } from "../../src/components/ui/DashboardSkeleton";
import { ErrorState } from "../../src/components/ui/ErrorState";
import { ErrorBoundary } from "../../src/components/ui/ErrorBoundary";
import { SessionShareCard } from "../../src/components/share/SessionShareCard";
import {
  shareSessionCard,
  SHARING_UNAVAILABLE,
} from "../../src/utils/shareSession";
import { useApp } from "../../src/context/AppContext";
import { useProGate } from "../../src/hooks/useProGate";
import { PaywallModal } from "../../src/components/billing/PaywallModal";
import { useTranslation } from "react-i18next";
import { analytics } from "../../src/services";
import {
  formatDateKey,
  getDaysOfWeek,
  getWeekNumber,
} from "../../src/utils/dateUtils";

function HomeScreenView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    user,
    workouts,
    monthWorkouts,
    rpeCheckIn,
    submitRpe,
    isLoading,
    errorMessage,
    refreshAllData,
    setSelectedDateKey,
  } = useApp();
  const { t } = useTranslation(["home", "common", "share"]);
  const gate = useProGate();

  const [currentRpe, setCurrentRpe] = useState<number>(rpeCheckIn?.rating || 5);
  const [isRpeSaved, setIsRpeSaved] = useState<boolean>(false);
  const [isSavingRpe, setIsSavingRpe] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showRpeInput, setShowRpeInput] = useState<boolean>(false);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    if (rpeCheckIn?.rating) {
      setCurrentRpe(rpeCheckIn.rating);
    }
  }, [rpeCheckIn]);

  const handleSliderChange = (val: number) => {
    setCurrentRpe(val);
    setIsRpeSaved(false);
  };

  const handleSaveRpe = async () => {
    try {
      setIsSavingRpe(true);
      analytics.trackEvent("home_rpe_checkin_saved", { rpe_value: currentRpe });
      await submitRpe(currentRpe);
      setIsRpeSaved(true);
    } catch (err) {
      console.error("Failed to save RPE:", err);
    } finally {
      setIsSavingRpe(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAllData();
    setRefreshing(false);
  };

  // Date actuelle réelle du jour
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const todayDateKey = formatDateKey(currentYear, currentMonth, currentDay);

  const frenchDaysFull = [
    "DIMANCHE",
    "LUNDI",
    "MARDI",
    "MERCREDI",
    "JEUDI",
    "VENDREDI",
    "SAMEDI",
  ];
  const frenchMonthsFull = [
    "JANVIER",
    "FÉVRIER",
    "MARS",
    "AVRIL",
    "MAI",
    "JUIN",
    "JUILLET",
    "AOÛT",
    "SEPTEMBRE",
    "OCTOBRE",
    "NOVEMBRE",
    "DÉCEMBRE",
  ];
  const todayFullDateLabel = `${frenchDaysFull[today.getDay()]} ${currentDay} ${frenchMonthsFull[currentMonth]}`;

  // La séance du jour affichée sur la page Home est STRICTEMENT celle du jour réel (jamais la sélection du calendrier)
  const todayWorkout =
    monthWorkouts?.[todayDateKey] ||
    workouts.find((w) => w.dateKey === todayDateKey) ||
    null;

  const heroSession = todayWorkout;
  const isHeroDone = heroSession?.status === "done";
  const isHeroRest = heroSession?.isRestDay || heroSession?.status === "rest";

  const handleShareSession = async () => {
    if (!heroSession) return;
    try {
      await shareSessionCard(shareCardRef, {
        dialogTitle: t("share:share_dialog_title"),
      });
      analytics.trackEvent("home_session_shared", {
        workout_id: heroSession.id,
      });
    } catch (error) {
      // Surface capture failures and platforms without file sharing instead of
      // swallowing them silently (a cancelled share sheet resolves, not rejects).
      const message =
        error instanceof Error && error.message === SHARING_UNAVAILABLE
          ? t("share:share_unavailable")
          : t("share:share_failed");
      Alert.alert(t("share:share_button"), message);
    }
  };

  const formatDurationSec = (sec?: number, fallback?: string): string => {
    if (!sec || sec <= 0) return fallback || "—";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) {
      return `${h}h${String(m).padStart(2, "0")}`;
    }
    return `${m} min`;
  };

  const isCommuteWorkout = (w?: any): boolean => {
    if (!w) return false;
    if (w.isCommute) return true;
    const cat = (w.category || "").toLowerCase();
    const title = (w.title || "").toLowerCase();
    return (
      cat.includes("déplacement") ||
      cat.includes("deplacement") ||
      cat.includes("transport") ||
      cat.includes("vélotaf") ||
      cat.includes("velotaf") ||
      title.includes("déplacement") ||
      title.includes("deplacement") ||
      title.includes("transport") ||
      title.includes("vélotaf") ||
      title.includes("velotaf") ||
      title.includes("trajet") ||
      title.includes("boulot") ||
      title.includes("travail")
    );
  };

  // Récupération de la dernière vraie séance terminée (hors trajets vélotaf)
  const allSessions = Object.values(monthWorkouts || {});
  const doneSessions = (allSessions.length > 0 ? allSessions : workouts)
    .filter((w) => w.status === "done" && !w.isRestDay && !isCommuteWorkout(w))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  const lastCompletedSession = doneSessions[0] || null;

  // Prochaine séance prévue (utile notamment quand aujourd'hui est un jour de repos ou déjà fait)
  const upcomingSessions = (allSessions.length > 0 ? allSessions : workouts)
    .filter(
      (w) =>
        w.dateKey > todayDateKey &&
        !w.isRestDay &&
        w.status !== "rest" &&
        !isCommuteWorkout(w),
    )
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const nextUpcomingSession = upcomingSessions[0] || null;

  // Calcul de la micro-progression kilométrique de la semaine active (Course à pied uniquement)
  const isRunningSession = (w?: any): boolean => {
    if (!w || w.isRestDay) return false;
    if (isCommuteWorkout(w)) return false;
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

  const currentWeekNum = getWeekNumber(today);
  const currentWeekDays = getDaysOfWeek(currentYear, currentWeekNum);
  const currentWeekSessions = currentWeekDays.map(
    (d) =>
      monthWorkouts?.[d.dateKey] ||
      workouts.find((w) => w.dateKey === d.dateKey),
  );
  const weekDoneKm = currentWeekSessions.reduce((sum, w) => {
    let dayKm = isRunningSession(w) ? w?.actualDistanceKm || 0 : 0;
    if (Array.isArray(w?.secondaryActivities)) {
      for (const sec of w.secondaryActivities) {
        if (sec.sportType === "running" && !isCommuteWorkout(sec)) {
          dayKm += sec.distanceKm || 0;
        }
      }
    }
    return sum + dayKm;
  }, 0);
  const weekPlannedKm = currentWeekSessions.reduce((sum, w) => {
    if (isRunningSession(w) && w?.distance) {
      const parsed = parseFloat(
        w.distance.replace(",", ".").replace(/[^0-9.]/g, ""),
      );
      return sum + (isNaN(parsed) ? 0 : parsed);
    }
    return sum;
  }, 0);
  const weekProgressPct =
    weekPlannedKm > 0
      ? Math.min(100, Math.round((weekDoneKm / weekPlannedKm) * 100))
      : 0;

  const heroEffortBlocks = Array.isArray(heroSession?.effortBlocks)
    ? heroSession.effortBlocks
    : [];

  const handleOpenDayInCalendar = async (dateKey: string) => {
    await setSelectedDateKey(dateKey);
    router.push("/(tabs)/calendar");
  };

  if (isLoading && !user) {
    return <DashboardSkeleton />;
  }

  // RILES-015 : sans profil, pas de dashboard « décoré » — on affiche
  // l'état d'erreur avec un bouton Réessayer (aucune donnée fabriquée).
  if (!user) {
    return (
      <View style={styles.errorScreen}>
        <ErrorState
          title="Impossible de charger tes données"
          message={
            errorMessage ||
            "Le serveur n'a pas répondu. Vérifie ta connexion puis réessaie."
          }
          onRetry={refreshAllData}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
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
        {/* Network Error Notice with Retry */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color="#B91C1C" />
            <Text style={styles.errorText} numberOfLines={2}>
              {errorMessage || "Erreur de chargement des données"}
            </Text>
            <TouchableOpacity onPress={refreshAllData} activeOpacity={0.7}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. Header (Avatar, Date, Greeting + Accès direct Roadmap) */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>{user?.initials || "MB"}</Text>
            </TouchableOpacity>
            <View style={styles.greetingContainer}>
              <Text style={styles.headerDate}>{todayFullDateLabel}</Text>
              <Text style={styles.headerTitle}>
                {t("home:header.greeting", {
                  name: user?.name?.split(" ")[0] || "Athlète",
                })}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerRoadmapBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/roadmap" as any)}
          >
            <MaterialCommunityIcons
              name="map-marker-path"
              size={15}
              color={Colors.primary}
            />
            <Text style={styles.headerRoadmapBtnText}>Roadmap</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Micro-progression & Aperçu des 7 jours de la semaine */}
        <View style={styles.weekProgressStrip}>
          <View style={styles.weekProgressInfoRow}>
            <View style={styles.weekProgressLabelLeft}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={15}
                color={Colors.primary}
              />
              <Text style={styles.weekProgressLabel}>
                Volume Semaine {currentWeekNum}
              </Text>
            </View>
            <Text style={styles.weekProgressKmText}>
              <Text style={styles.weekProgressDoneText}>
                {weekDoneKm.toFixed(1).replace(".", ",")} km
              </Text>
              {weekPlannedKm > 0 ? (
                <Text style={styles.weekProgressTargetText}>
                  {" "}
                  / {weekPlannedKm.toFixed(0)} km
                </Text>
              ) : null}
            </Text>
          </View>

          <View style={styles.weekProgressBarBg}>
            <View
              style={[
                styles.weekProgressBarFill,
                { width: `${Math.max(4, Math.min(100, weekProgressPct))}%` },
              ]}
            />
          </View>

          {/* Mini-timeline interactive des 7 jours de la semaine en cours */}
          <View style={styles.miniWeekDaysRow}>
            {currentWeekDays.map((day, idx) => {
              const w = currentWeekSessions[idx];
              const isToday = day.dateKey === todayDateKey;
              const isDone =
                w?.status === "done" && !w?.isRestDay && !isCommuteWorkout(w);
              const isRest = !w || w.isRestDay || w.status === "rest";

              return (
                <TouchableOpacity
                  key={day.dateKey}
                  style={[
                    styles.miniDayPill,
                    isToday && styles.miniDayPillToday,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleOpenDayInCalendar(day.dateKey)}
                >
                  <Text
                    style={[
                      styles.miniDayLabel,
                      isToday && styles.miniDayLabelToday,
                    ]}
                  >
                    {day.dayName.slice(0, 1)}
                  </Text>
                  <View
                    style={[
                      styles.miniDayStatusCircle,
                      isDone && styles.miniDayStatusDone,
                      isToday && !isDone && styles.miniDayStatusToday,
                      !isDone &&
                        !isToday &&
                        !isRest &&
                        styles.miniDayStatusPlanned,
                    ]}
                  >
                    {isDone ? (
                      <Feather
                        name="check"
                        size={10}
                        color={Colors.textWhite}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.miniDayNumText,
                          isToday && styles.miniDayNumTextToday,
                          isRest && !isToday && { color: Colors.textMuted },
                        ]}
                      >
                        {day.dayNumber}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Hero Card : Séance du Jour complète et structurée */}
        <View style={styles.heroCard}>
          <View style={styles.heroCurveOne} />
          <View style={styles.heroCurveTwo} />

          {/* En-tête de la carte : Statut + Catégorie/Zone */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroTopBadgeRow}>
              <Text style={styles.heroTimeLabel}>
                {isHeroDone
                  ? `SÉANCE RÉALISÉE${heroSession?.sourceProvider ? ` • ${heroSession.sourceProvider.toUpperCase()}` : ""}`
                  : isHeroRest
                    ? "AUJOURD'HUI • JOUR DE REPOS"
                    : `AUJOURD'HUI • ${heroSession?.timeLabel || "AU PROGRAMME"}`}
              </Text>
            </View>

            {!isHeroRest &&
              (heroSession?.targetZoneLabel || heroSession?.category) && (
                <View style={styles.heroZoneTopPill}>
                  <Text style={styles.heroZoneTopPillText}>
                    {heroSession?.targetZoneLabel || heroSession?.category}
                    {heroSession?.targetZoneBpm && !isHeroDone
                      ? ` (${heroSession.targetZoneBpm})`
                      : ""}
                  </Text>
                </View>
              )}
          </View>

          <Text style={styles.heroTitle}>
            {heroSession?.title ||
              (isHeroRest ? "Jour de repos" : "Footing Fondamental Z2")}
          </Text>

          {/* Contenu principal selon l'état de la séance du jour */}
          {isHeroRest ? (
            <View style={styles.heroRestContainer}>
              <View style={styles.heroRestBox}>
                <Ionicons
                  name="moon-outline"
                  size={18}
                  color="rgba(255, 255, 255, 0.95)"
                />
                <Text style={styles.heroRestText}>
                  {heroSession?.aiAdjustmentNote ||
                    "Journée d'assimilation physiologique : laisse ton corps régénérer ses fibres et consolider les adaptations des dernières séances."}
                </Text>
              </View>

              {nextUpcomingSession && (
                <TouchableOpacity
                  style={styles.heroNextWorkoutPreview}
                  activeOpacity={0.85}
                  onPress={() =>
                    handleOpenDayInCalendar(nextUpcomingSession.dateKey)
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroNextWorkoutSuper}>
                      PROCHAINE SÉANCE PRÉVUE •{" "}
                      {nextUpcomingSession.dayName?.toUpperCase()}{" "}
                      {nextUpcomingSession.dayNumber}
                    </Text>
                    <Text style={styles.heroNextWorkoutTitle} numberOfLines={1}>
                      {nextUpcomingSession.title}
                    </Text>
                    <Text style={styles.heroNextWorkoutMeta}>
                      {nextUpcomingSession.distance} (
                      {nextUpcomingSession.duration}) • Allure cible{" "}
                      {nextUpcomingSession.targetPace || "Z2"}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={Colors.textWhite}
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {/* Cartouche des 3 métriques principales */}
              <View style={styles.heroMetricsCartouche}>
                <View style={styles.heroMetricItem}>
                  <Text style={styles.heroMetricLabel}>DISTANCE</Text>
                  <Text style={styles.heroMetricValue}>
                    {isHeroDone && heroSession?.actualDistanceKm !== undefined
                      ? `${heroSession.actualDistanceKm.toFixed(1).replace(".", ",")} km`
                      : heroSession?.distance || "—"}
                  </Text>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetricItem}>
                  <Text style={styles.heroMetricLabel}>DURÉE</Text>
                  <Text style={styles.heroMetricValue}>
                    {isHeroDone && heroSession?.actualDurationSec
                      ? formatDurationSec(heroSession.actualDurationSec)
                      : heroSession?.duration || "—"}
                  </Text>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetricItem}>
                  <Text style={styles.heroMetricLabel}>
                    {isHeroDone ? "ALLURE" : "ALLURE CIBLE"}
                  </Text>
                  <Text style={styles.heroMetricValue}>
                    {isHeroDone && heroSession?.actualPace
                      ? heroSession.actualPace
                      : heroSession?.targetPace || "—"}
                  </Text>
                </View>
              </View>

              {/* Détails supplémentaires : Métriques Strava (si faite) OU Structure des blocs (si prévue) */}
              {isHeroDone ? (
                <View style={styles.heroSubDetailsBox}>
                  <View style={styles.heroDoneMetricsRow}>
                    {heroSession?.actualAvgHeartRate ? (
                      <View style={styles.heroDoneChip}>
                        <Ionicons
                          name="heart"
                          size={12}
                          color="rgba(255,255,255,0.95)"
                        />
                        <Text style={styles.heroDoneChipText}>
                          {heroSession.actualAvgHeartRate} bpm moy.
                          {heroSession.actualMaxHeartRate
                            ? ` (max ${heroSession.actualMaxHeartRate})`
                            : ""}
                        </Text>
                      </View>
                    ) : null}

                    {heroSession?.actualElevationGain !== undefined &&
                    heroSession.actualElevationGain > 0 ? (
                      <View style={styles.heroDoneChip}>
                        <Feather
                          name="trending-up"
                          size={12}
                          color="rgba(255,255,255,0.95)"
                        />
                        <Text style={styles.heroDoneChipText}>
                          +{Math.round(heroSession.actualElevationGain)} m D+
                        </Text>
                      </View>
                    ) : null}

                    {heroSession?.actualCadence ? (
                      <View style={styles.heroDoneChip}>
                        <MaterialCommunityIcons
                          name="shoe-print"
                          size={12}
                          color="rgba(255,255,255,0.95)"
                        />
                        <Text style={styles.heroDoneChipText}>
                          {heroSession.actualCadence} spm
                        </Text>
                      </View>
                    ) : null}

                    {heroSession?.tss ? (
                      <View style={styles.heroDoneChip}>
                        <MaterialCommunityIcons
                          name="lightning-bolt"
                          size={12}
                          color="rgba(255,255,255,0.95)"
                        />
                        <Text style={styles.heroDoneChipText}>
                          Charge {heroSession.tss} TSS
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {Array.isArray(heroSession?.secondaryActivities) &&
                    heroSession.secondaryActivities.filter(
                      (s: any) => !isCommuteWorkout(s),
                    ).length > 0 && (
                      <Text style={styles.heroSecondaryActivityNote}>
                        +{" "}
                        {
                          heroSession.secondaryActivities.filter(
                            (s: any) => !isCommuteWorkout(s),
                          ).length
                        }{" "}
                        autre activité enregistrée aujourd'hui
                      </Text>
                    )}
                </View>
              ) : (
                <View style={styles.heroSubDetailsBox}>
                  {heroEffortBlocks.length > 0 && (
                    <View style={styles.heroBlocksSection}>
                      <Text style={styles.heroBlocksHeaderLabel}>
                        DÉROULÉ DE LA SÉANCE
                      </Text>
                      <View style={styles.heroBlocksList}>
                        {heroEffortBlocks
                          .slice(0, 4)
                          .map((b: any, idx: number) => (
                            <View key={idx} style={styles.heroBlockItem}>
                              <View style={styles.heroBlockDot} />
                              <Text
                                style={styles.heroBlockTitleText}
                                numberOfLines={1}
                              >
                                {b.title}
                              </Text>
                              <Text style={styles.heroBlockDurText}>
                                {b.durationLabel}
                              </Text>
                            </View>
                          ))}
                      </View>
                    </View>
                  )}

                  {heroSession?.aiAdjustmentNote ? (
                    <View style={styles.heroCoachNoteRow}>
                      <Feather
                        name="compass"
                        size={13}
                        color="rgba(255, 255, 255, 0.9)"
                      />
                      <Text style={styles.heroCoachNoteText} numberOfLines={2}>
                        {heroSession.aiAdjustmentNote}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </>
          )}

          {/* Barre d'actions de la séance du jour : Parler au coach + Ouvrir dans le calendrier */}
          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.heroWhiteBtn}
              activeOpacity={0.9}
              onPress={() =>
                gate.requirePro(() =>
                  router.push({
                    pathname: "/chat",
                    params: {
                      from: "home",
                      dateKey: todayDateKey,
                      workoutTitle:
                        heroSession?.title ||
                        (isHeroRest ? "Jour de repos" : undefined),
                    },
                  } as any),
                )
              }
            >
              <View style={styles.heroWhiteBtnContent}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={19}
                  color={Colors.primary}
                />
                <Text style={styles.heroWhiteBtnText}>Parler au coach</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroCalendarSecondaryBtn}
              activeOpacity={0.85}
              onPress={() => handleOpenDayInCalendar(todayDateKey)}
            >
              <Feather name="calendar" size={17} color={Colors.textWhite} />
              <Text style={styles.heroCalendarSecondaryBtnText}>Détails</Text>
            </TouchableOpacity>

            {isHeroDone && heroSession && (
              <TouchableOpacity
                style={styles.heroShareBtn}
                activeOpacity={0.85}
                onPress={handleShareSession}
                accessibilityRole="button"
                accessibilityLabel={t("share:share_session")}
              >
                <Feather name="share-2" size={17} color={Colors.textWhite} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 4. Carte Dynamique : Check-in post-séance OU Forme & Disponibilité Banister */}
        {showRpeInput ? (
          <Card style={styles.checkInCard}>
            <View style={styles.checkInHeaderRow}>
              <Text style={styles.checkInSubtitle}>
                {lastCompletedSession &&
                lastCompletedSession.actualDistanceKm !== undefined
                  ? `DERNIÈRE SÉANCE • ${lastCompletedSession.actualDistanceKm.toFixed(1).replace(".", ",")} KM À ${lastCompletedSession.actualPace || lastCompletedSession.targetPace}${lastCompletedSession.actualAvgHeartRate ? ` (${lastCompletedSession.actualAvgHeartRate} BPM)` : ""}`
                  : "CHECK-IN • DERNIÈRE SORTIE RÉALISÉE"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowRpeInput(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.checkInTitle}>
              Ressenti dernière{"\n"}sortie
            </Text>

            <EffortSlider
              value={currentRpe}
              min={1}
              max={10}
              onValueChange={handleSliderChange}
            />

            <View style={styles.rpeActionRow}>
              <TouchableOpacity
                style={[styles.saveRpeBtn, isRpeSaved && styles.saveRpeBtnDone]}
                onPress={async () => {
                  await handleSaveRpe();
                  setTimeout(() => setShowRpeInput(false), 800);
                }}
                disabled={isSavingRpe}
                activeOpacity={0.8}
              >
                {isSavingRpe ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons
                    name={isRpeSaved ? "checkmark-circle" : "save-outline"}
                    size={16}
                    color={isRpeSaved ? Colors.successText : Colors.primary}
                  />
                )}
                <Text
                  style={[
                    styles.saveRpeText,
                    isRpeSaved && styles.saveRpeTextDone,
                  ]}
                >
                  {isSavingRpe
                    ? "Synchronisation..."
                    : isRpeSaved
                      ? "Ressenti enregistré ✓"
                      : "Valider mon ressenti (RPE)"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.aiMessageContainer}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={18}
                color={Colors.primary}
                style={styles.aiSparkleIcon}
              />
              <Text style={styles.aiMessageText}>
                {rpeCheckIn?.aiPreservationMessage ||
                  "L'IA ajuste tes allures pour préserver tes tendons et mollets."}
              </Text>
            </View>
          </Card>
        ) : (
          <Card style={styles.readinessCard}>
            <View style={styles.readinessHeaderRow}>
              <View style={styles.readinessHeaderLeft}>
                <View style={styles.readinessPulseBox}>
                  <MaterialCommunityIcons
                    name="heart-pulse"
                    size={18}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.readinessSubtitle}>
                  FORME DU JOUR • DISPONIBILITÉ
                </Text>
              </View>
              <View style={styles.readinessCardBadge}>
                <Text style={styles.readinessCardBadgeText}>
                  {user?.readinessScore ? `${user.readinessScore}%` : "85%"}
                </Text>
              </View>
            </View>

            <Text style={styles.readinessTitle}>Disponibilité & Forme</Text>

            <Text style={styles.readinessInsightText}>
              {isHeroRest
                ? "Jour de récupération. Tes muscles et articulations se régénèrent pour aborder tes prochaines séances avec un maximum de fraîcheur."
                : isHeroDone
                  ? "Séance du jour validée ! Tes données Strava sont intégrées à ta charge Banister pour recalibrer ton niveau de forme."
                  : `Score de fraîcheur à ${user?.readinessScore || 85}%. Tes indicateurs physiologiques sont au vert pour réaliser ta séance d'aujourd'hui.`}
            </Text>

            {lastCompletedSession && (
              <TouchableOpacity
                style={styles.rpeSummaryRow}
                activeOpacity={0.7}
                onPress={() => setShowRpeInput(true)}
              >
                <View style={styles.rpeSummaryLeft}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Colors.successText}
                  />
                  <Text style={styles.rpeSummaryText} numberOfLines={1}>
                    Dernière séance :{" "}
                    {lastCompletedSession.actualDistanceKm
                      ? `${lastCompletedSession.actualDistanceKm.toFixed(1).replace(".", ",")} km`
                      : lastCompletedSession.distance || "—"}{" "}
                    ({lastCompletedSession.title}) • RPE {currentRpe}/10
                  </Text>
                </View>
                <Text style={styles.rpeEditBtn}>Modifier</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* 5. Carte Objectif & Roadmap du Plan Marathon */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/roadmap" as any)}
        >
          <Card style={styles.roadmapCard}>
            <View style={styles.roadmapCardTopRow}>
              <View style={styles.roadmapBadgeRow}>
                <View style={styles.roadmapIconBox}>
                  <MaterialCommunityIcons
                    name="flag-checkered"
                    size={18}
                    color={Colors.primary}
                  />
                </View>
                <View>
                  <Text style={styles.roadmapSuperLabel}>
                    MA PRÉPARATION • ROADMAP
                  </Text>
                  <Text style={styles.roadmapGoalTitle}>
                    {user?.activeGoal?.title || "Marathon"}
                    {user?.activeGoal?.target
                      ? ` • ${user.activeGoal.target}`
                      : ""}
                  </Text>
                </View>
              </View>

              <View style={styles.roadmapWeeksPill}>
                <Text style={styles.roadmapWeeksPillText}>
                  {user?.activeGoal?.weeksRemaining
                    ? `${user.activeGoal.weeksRemaining} sem.`
                    : "En cours"}
                </Text>
              </View>
            </View>

            {user?.stravaSixMonthsSummary?.estimatedPaces && (
              <View style={styles.roadmapPacesStrip}>
                <View style={styles.roadmapPaceChip}>
                  <Text style={styles.roadmapPaceChipLabel}>Z2</Text>
                  <Text style={styles.roadmapPaceChipVal}>
                    {user.stravaSixMonthsSummary.estimatedPaces.easyPaceZ2
                      ?.split("–")[0]
                      ?.trim() ||
                      user.stravaSixMonthsSummary.estimatedPaces.easyPaceZ2 ||
                      "—"}
                  </Text>
                </View>
                <View style={styles.roadmapPaceChip}>
                  <Text style={styles.roadmapPaceChipLabel}>Allure Cible</Text>
                  <Text style={styles.roadmapPaceChipVal}>
                    {user.stravaSixMonthsSummary.estimatedPaces.marathonPaceZ3}
                  </Text>
                </View>
                <View style={styles.roadmapPaceChip}>
                  <Text style={styles.roadmapPaceChipLabel}>Seuil Z4</Text>
                  <Text style={styles.roadmapPaceChipVal}>
                    {user.stravaSixMonthsSummary.estimatedPaces.thresholdPaceZ4}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.roadmapFooterRow}>
              <Text style={styles.roadmapRaceDateText}>
                {user?.activeGoal?.raceDate
                  ? `Échéance : ${user.activeGoal.raceDate}`
                  : "Voir les 4 phases et le découpage des semaines"}
              </Text>
              <View style={styles.roadmapCtaRight}>
                <Text style={styles.roadmapCtaText}>Voir la roadmap</Text>
                <Feather name="arrow-right" size={14} color={Colors.primary} />
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* 6. Running Club Snippet Card */}
        <TouchableOpacity
          style={styles.clubCard}
          activeOpacity={0.9}
          onPress={() => router.push("/(tabs)/community")}
        >
          <View style={styles.clubIconCircle}>
            <Ionicons name="people" size={22} color={Colors.textWhite} />
          </View>

          <View style={styles.clubContent}>
            <Text style={styles.clubCategory}>RUNNING CLUB NANTES</Text>
            <Text style={styles.clubTitle}>Sortie collective jeudi soir</Text>
            <View style={styles.clubMetaRow}>
              <Text style={styles.clubMembers}>12 inscrits • </Text>
              <Text style={styles.clubActionLink}>Rejoindre le club</Text>
            </View>
          </View>

          <Feather name="chevron-right" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Soft gate: shown only when a Pro action is tapped without entitlement. */}
      <PaywallModal
        visible={gate.paywallVisible}
        state={gate.state}
        trialDaysRemaining={gate.trialDaysRemaining}
        onClose={gate.closePaywall}
        onSubscribe={gate.subscribe}
        onRestore={gate.restore}
        isSubscribing={gate.isSubscribing}
        error={gate.subscribeError}
      />

      {/* On-screen but invisible capture host. It lives OUTSIDE the ScrollView
          so Android does not skip/clip it, yet opacity 0 + pointerEvents none
          keep it from affecting the visible UI. The ref is on the inner card,
          so the wrapper's opacity is not baked into the captured image. */}
      {isHeroDone && heroSession && (
        <View
          style={styles.shareCaptureHost}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <SessionShareCard ref={shareCardRef} session={heroSession} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl * 2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: "#991B1B",
    fontWeight: "600",
  },
  retryText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: "800",
  },

  // 1. Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.heroAccent,
  },
  avatarText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.md,
    fontWeight: "800",
  },
  greetingContainer: {
    justifyContent: "center",
    flex: 1,
  },
  headerDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  headerRoadmapBtn: {
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
  headerRoadmapBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.primary,
  },

  // 2. Micro-progression hebdo + Mini-timeline 7 jours
  weekProgressStrip: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  weekProgressInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  weekProgressLabelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  weekProgressLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  weekProgressKmText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "600",
  },
  weekProgressDoneText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
  weekProgressTargetText: {
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  weekProgressBarBg: {
    height: 5,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  weekProgressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  miniWeekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
  },
  miniDayPill: {
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.md,
  },
  miniDayPillToday: {
    backgroundColor: Colors.primaryMuted,
  },
  miniDayLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  miniDayLabelToday: {
    color: Colors.primary,
    fontWeight: "800",
  },
  miniDayStatusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  miniDayStatusDone: {
    backgroundColor: Colors.success,
  },
  miniDayStatusToday: {
    backgroundColor: Colors.primary,
  },
  miniDayStatusPlanned: {
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    backgroundColor: "#FFF9F7",
  },
  miniDayNumText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  miniDayNumTextToday: {
    color: Colors.textWhite,
    fontWeight: "800",
  },

  // 3. Hero Card
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    overflow: "hidden",
    position: "relative",
    ...Shadows.heroAccent,
  },
  heroCurveOne: {
    position: "absolute",
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  heroCurveTwo: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: 8,
  },
  heroTopBadgeRow: {
    flex: 1,
  },
  heroTimeLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.92)",
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  heroZoneTopPill: {
    backgroundColor: "rgba(15, 23, 42, 0.22)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  heroZoneTopPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textWhite,
  },
  heroTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    color: Colors.textWhite,
    marginBottom: Spacing.md,
  },
  heroMetricsCartouche: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: Spacing.md,
  },
  heroMetricItem: {
    alignItems: "center",
    flex: 1,
  },
  heroMetricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  heroMetricValue: {
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    color: Colors.textWhite,
  },
  heroMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  heroSubDetailsBox: {
    marginBottom: Spacing.lg,
    gap: 10,
  },
  heroDoneMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroDoneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15, 23, 42, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  heroDoneChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textWhite,
  },
  heroSecondaryActivityNote: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
  },
  heroBlocksSection: {
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    borderRadius: BorderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  heroBlocksHeaderLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.78)",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  heroBlocksList: {
    gap: 5,
  },
  heroBlockItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroBlockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.textWhite,
  },
  heroBlockTitleText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textWhite,
  },
  heroBlockDurText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.92)",
  },
  heroCoachNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingHorizontal: 2,
  },
  heroCoachNoteText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 17,
    color: "rgba(255, 255, 255, 0.92)",
    fontWeight: "500",
  },
  heroRestContainer: {
    marginBottom: Spacing.lg,
    gap: 10,
  },
  heroRestBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: BorderRadius.lg,
    padding: 12,
  },
  heroRestText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
  },
  heroNextWorkoutPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.2)",
    borderRadius: BorderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  heroNextWorkoutSuper: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.78)",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  heroNextWorkoutTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: "800",
    color: Colors.textWhite,
  },
  heroNextWorkoutMeta: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.88)",
    fontWeight: "600",
    marginTop: 1,
  },
  heroActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroWhiteBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: Spacing.lg,
    ...Shadows.card,
  },
  heroWhiteBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroWhiteBtnText: {
    color: Colors.primary,
    fontWeight: "800",
    fontSize: Typography.sizes.sm,
  },
  heroCalendarSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.22)",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
  },
  heroCalendarSecondaryBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.textWhite,
  },
  heroShareBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.22)",
  },
  shareCaptureHost: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    overflow: "visible",
    opacity: 0,
  },

  // 4. Check-in Card
  checkInCard: {
    marginBottom: Spacing.xl,
  },
  checkInHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  checkInSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  checkInTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: 28,
    marginBottom: Spacing.md,
  },
  rpeActionRow: {
    alignItems: "flex-start",
    marginTop: Spacing.sm,
  },
  saveRpeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryMuted,
  },
  saveRpeBtnDone: {
    backgroundColor: Colors.successLight,
  },
  saveRpeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.primary,
  },
  saveRpeTextDone: {
    color: Colors.successText,
  },
  aiMessageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  aiSparkleIcon: {
    marginTop: 2,
  },
  aiMessageText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    lineHeight: 20,
    fontWeight: "500",
  },

  // 4b. Readiness & Banister Form Card
  readinessCard: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.card,
  },
  readinessHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  readinessHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  readinessPulseBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  readinessSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  readinessCardBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  readinessCardBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: "#059669",
  },
  readinessTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  readinessInsightText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  rpeSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  rpeSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  rpeSummaryText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  rpeEditBtn: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: "700",
    marginLeft: 8,
  },

  // 5. Roadmap Card on Home
  roadmapCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: "#FFFDFB",
  },
  roadmapCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  roadmapBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  roadmapIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  roadmapSuperLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  roadmapGoalTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  roadmapWeeksPill: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  roadmapWeeksPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },
  roadmapPacesStrip: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
  },
  roadmapPaceChip: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  roadmapPaceChipLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  roadmapPaceChipVal: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  roadmapFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  roadmapRaceDateText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  roadmapCtaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roadmapCtaText: {
    fontSize: Typography.sizes.xs,
    fontWeight: "800",
    color: Colors.primary,
  },

  // 6. Running Club Snippet Card
  clubCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9F7",
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  clubIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.subtle,
  },
  clubContent: {
    flex: 1,
  },
  clubCategory: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  clubTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  clubMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  clubMembers: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  clubActionLink: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: "700",
  },
});

/**
 * RILES-041 : frontière d'erreur propre à l'onglet Accueil — un plantage
 * n'emporte que cette page (état d'erreur + « Réessayer »), le reste de
 * l'app reste utilisable.
 */
export default function HomeScreen() {
  return (
    <ErrorBoundary title="L'accueil n'a pas pu être affiché">
      <HomeScreenView />
    </ErrorBoundary>
  );
}
