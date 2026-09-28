import React, { useState, useEffect } from "react";
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
} from "../../src/constants/theme";
import { Card } from "../../src/components/ui/Card";
import { Badge } from "../../src/components/ui/Badge";
import { EffortSlider } from "../../src/components/ui/Slider";
import { DashboardSkeleton } from "../../src/components/ui/DashboardSkeleton";
import { useApp } from "../../src/context/AppContext";
import { useTranslation } from "react-i18next";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    user,
    workouts,
    selectedWorkout,
    rpeCheckIn,
    submitRpe,
    isLoading,
    errorMessage,
    refreshAllData,
  } = useApp();
  const { t } = useTranslation(["home", "common"]);

  const [currentRpe, setCurrentRpe] = useState<number>(rpeCheckIn?.rating || 5);
  const [isRpeSaved, setIsRpeSaved] = useState<boolean>(false);
  const [isSavingRpe, setIsSavingRpe] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

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

  const heroSession = selectedWorkout;
  const isHeroDone = heroSession?.status === "done";
  const lastCompletedSession =
    [...workouts].reverse().find((w) => w.status === "done" && !w.isRestDay) ||
    null;

  if (isLoading && !user) {
    return <DashboardSkeleton />;
  }

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
      {/* Network Error Notice with Retry */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>
            Mode hors-ligne : données locales
          </Text>
          <TouchableOpacity onPress={refreshAllData} activeOpacity={0.7}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 1. Header (Avatar, Date, Greeting) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{user?.initials || "ML"}</Text>
          </TouchableOpacity>
          <View style={styles.greetingContainer}>
            <Text style={styles.headerDate}>
              {heroSession?.fullDateLabel || "MERCREDI 14 OCTOBRE"}
            </Text>
            <Text style={styles.headerTitle}>
              {t("home:header.greeting", { name: user?.name || "Marius" })}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Hero Card (Aujourd'hui • 18:30) */}
      <View style={styles.heroCard}>
        {/* Decorative background shapes */}
        <View style={styles.heroCurveOne} />
        <View style={styles.heroCurveTwo} />

        <View style={styles.heroTopRow}>
          <Text style={styles.heroTimeLabel}>
            {isHeroDone
              ? `SÉANCE RÉALISÉE${heroSession?.sourceProvider ? ` • ${heroSession.sourceProvider.toUpperCase()}` : ""}`
              : heroSession?.timeLabel || "AUJOURD'HUI • 18:30"}
          </Text>
          <TouchableOpacity
            style={styles.heroLightningBtn}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/calendar")}
          >
            <Ionicons name="flash" size={16} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        <Text style={styles.heroTitle}>
          {heroSession?.title || "Sortie Seuil & Allure Cible"}
        </Text>

        {/* Tags row: affiche les vraies données exécutées si la séance est terminée (done), sinon les cibles */}
        <View style={styles.heroTagsRow}>
          {isHeroDone && heroSession?.actualDistanceKm !== undefined ? (
            <>
              <Badge
                label={`Réalisé : ${heroSession.actualDistanceKm.toFixed(1).replace(".", ",")} km`}
                variant="heroTag"
                style={styles.heroTagItem}
              />
              {heroSession.actualPace && (
                <Badge
                  label={`Allure réelle : ${heroSession.actualPace}`}
                  variant="heroTag"
                  style={styles.heroTagItem}
                />
              )}
              {heroSession.actualAvgHeartRate && (
                <Badge
                  label={`FC moy : ${heroSession.actualAvgHeartRate} bpm`}
                  variant="heroTag"
                  style={styles.heroTagItem}
                />
              )}
            </>
          ) : heroSession?.tags && heroSession.tags.length > 0 ? (
            heroSession.tags.map((tag, idx) => (
              <Badge
                key={idx}
                label={tag}
                variant="heroTag"
                style={styles.heroTagItem}
              />
            ))
          ) : (
            <>
              <Badge
                label={heroSession?.distance || "8,5 km"}
                variant="heroTag"
                style={styles.heroTagItem}
              />
              <Badge
                label={`Allure cible : ${heroSession?.targetPace || "4:45/km"}`}
                variant="heroTag"
                style={styles.heroTagItem}
              />
              <Badge
                label={heroSession?.targetZoneLabel || "Zone 3/4"}
                variant="heroTag"
                style={styles.heroTagItem}
              />
            </>
          )}
        </View>

        {/* White CTA: Bouton général vers le Coach */}
        <TouchableOpacity
          style={styles.heroWhiteBtn}
          activeOpacity={0.9}
          onPress={() => router.push("/chat" as any)}
        >
          <View style={styles.heroWhiteBtnContent}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.heroWhiteBtnText}>
              J'ai un problème / J'en parle au coach
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 3. Check-in Card (Ressenti dernière sortie avec vraies données) */}
      <Card style={styles.checkInCard}>
        <View style={styles.checkInHeaderRow}>
          <Text style={styles.checkInSubtitle}>
            {lastCompletedSession &&
            lastCompletedSession.actualDistanceKm !== undefined
              ? `DERNIÈRE SÉANCE • ${lastCompletedSession.actualDistanceKm.toFixed(1).replace(".", ",")} KM À ${lastCompletedSession.actualPace || lastCompletedSession.targetPace}${lastCompletedSession.actualAvgHeartRate ? ` (${lastCompletedSession.actualAvgHeartRate} BPM)` : ""}`
              : "CHECK-IN • DERNIÈRE SORTIE RÉALISÉE"}
          </Text>
          <View style={styles.pulseIconBox}>
            <MaterialCommunityIcons
              name="heart-pulse"
              size={20}
              color={Colors.primary}
            />
          </View>
        </View>

        <Text style={styles.checkInTitle}>Ressenti dernière{"\n"}sortie</Text>

        {/* Interactive Effort Slider */}
        <EffortSlider
          value={currentRpe}
          min={1}
          max={10}
          onValueChange={handleSliderChange}
        />

        {/* Save confirmation button */}
        <View style={styles.rpeActionRow}>
          <TouchableOpacity
            style={[styles.saveRpeBtn, isRpeSaved && styles.saveRpeBtnDone]}
            onPress={handleSaveRpe}
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
              style={[styles.saveRpeText, isRpeSaved && styles.saveRpeTextDone]}
            >
              {isSavingRpe
                ? "Synchronisation..."
                : isRpeSaved
                  ? "Ressenti enregistré ✓"
                  : "Valider mon ressenti (RPE)"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* AI adjustment message */}
        <View style={styles.aiMessageContainer}>
          <Ionicons
            name="sparkles"
            size={18}
            color={Colors.primary}
            style={styles.aiSparkleIcon}
          />
          <Text style={styles.aiMessageText}>
            {rpeCheckIn?.aiPreservationMessage ||
              "L'IA a ajusté le seuil pour préserver tes mollets aujourd'hui."}
          </Text>
        </View>
      </Card>

      {/* 4. Running Club Snippet Card */}
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
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  headerDate: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  readinessWrapper: {
    alignItems: "flex-end",
  },
  readinessBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 6,
    ...Shadows.subtle,
  },
  readinessPercent: {
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  readinessCaption: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 4,
  },

  // 2. Hero Card
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
    marginBottom: Spacing.md,
  },
  heroTimeLabel: {
    fontSize: Typography.sizes.xs,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroLightningBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: Colors.textWhite,
    marginBottom: Spacing.lg,
  },
  heroTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  heroTagItem: {
    marginRight: 0,
  },
  heroWhiteBtn: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    ...Shadows.card,
  },
  heroWhiteBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroWhiteBtnText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: Typography.sizes.md,
  },

  // 3. Check-in Card
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
  pulseIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
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

  // 4. Running Club Snippet Card
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
