import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
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
import { Button } from "../../src/components/ui/Button";
import { useApp } from "../../src/context/AppContext";

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { communityRuns, challenge, toggleCommunityRun } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<
    "runs" | "challenges" | "members"
  >("runs");

  const featuredRun = communityRuns[0];
  const secondRun = communityRuns[1];

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
          <Text style={styles.headerSubtitle}>COMMUNAUTÉ</Text>
          <Text style={styles.headerTitle}>Running Club</Text>
          <View style={styles.cityPill}>
            <Ionicons name="location-sharp" size={14} color={Colors.primary} />
            <Text style={styles.cityText}>Nantes & alentours</Text>
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
            Sorties de groupe
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
            Défis du mois
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
            Membres
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Featured Club Run */}
      {featuredRun && (
        <Card style={styles.featuredCard}>
          <View style={styles.featuredTopRow}>
            <Badge label={featuredRun.tag} variant="status" />
            <View style={styles.distanceBadge}>
              <Feather name="map-pin" size={12} color={Colors.textSecondary} />
              <Text style={styles.distanceBadgeText}>
                {featuredRun.location}
              </Text>
            </View>
          </View>

          <Text style={styles.featuredTitle}>{featuredRun.title}</Text>
          <Text style={styles.featuredDescription}>
            {featuredRun.description}
          </Text>

          <View style={styles.featuredMetaRow}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={15} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {featuredRun.dateLabel} • {featuredRun.timeLabel}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons
                name="people-outline"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.metaText}>
                {featuredRun.attendeesCount} inscrits
              </Text>
            </View>
          </View>

          <Button
            label={
              featuredRun.isUserRegistered
                ? "Inscrit ✓ (Annuler)"
                : "Participer à la sortie"
            }
            variant={featuredRun.isUserRegistered ? "outline" : "primary"}
            onPress={() => toggleCommunityRun(featuredRun.id)}
          />
        </Card>
      )}

      {/* 4. Second Run Card */}
      {secondRun && (
        <Card style={styles.runCard}>
          <View style={styles.runCardHeader}>
            <View style={styles.runIconCircle}>
              <MaterialCommunityIcons
                name="run-fast"
                size={22}
                color={Colors.primary}
              />
            </View>
            <View style={styles.runContent}>
              <Text style={styles.runCategory}>{secondRun.category}</Text>
              <Text style={styles.runTitle}>{secondRun.title}</Text>
              <Text style={styles.runSub}>{secondRun.description}</Text>
            </View>
          </View>

          <View style={styles.runDivider} />

          <View style={styles.runBottomRow}>
            <Text style={styles.runAttendees}>
              {secondRun.attendeesCount} coureurs inscrits
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleCommunityRun(secondRun.id)}
            >
              <Text style={styles.runActionText}>
                {secondRun.isUserRegistered ? "Inscrit ✓" : "Participer →"}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* 5. Club Challenge Card */}
      {challenge && (
        <Card variant="peach" style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <View style={styles.trophyCircle}>
              <Ionicons name="trophy" size={22} color={Colors.textWhite} />
            </View>
            <View style={styles.challengeTextCol}>
              <Text style={styles.challengeBadge}>{challenge.badge}</Text>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
            </View>
          </View>
          <Text style={styles.challengeSubtitle}>{challenge.description}</Text>

          <View style={styles.challengeBarBg}>
            <View
              style={[
                styles.challengeBarFill,
                {
                  width: `${(challenge.currentKm / challenge.targetKm) * 100}%`,
                },
              ]}
            />
          </View>
          <View style={styles.challengeNumbersRow}>
            <Text style={styles.challengeProgressText}>
              {challenge.currentKm} km courus
            </Text>
            <Text style={styles.challengeGoalText}>
              Objectif {challenge.targetKm} km
            </Text>
          </View>
        </Card>
      )}
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

  // 3. Featured Card
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

  // 4. Run Card
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

  // 5. Challenge Card
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
