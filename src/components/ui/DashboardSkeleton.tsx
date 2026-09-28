import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, BorderRadius, Shadows } from "../../constants/theme";

export const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}> = ({ width, height, borderRadius = BorderRadius.md, style }) => {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: "#E2E8F0",
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 16) + Spacing.sm },
      ]}
    >
      {/* 1. Header Skeleton */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SkeletonBox width={48} height={48} borderRadius={24} />
          <View style={styles.headerTexts}>
            <SkeletonBox width={140} height={12} borderRadius={6} />
            <SkeletonBox
              width={180}
              height={22}
              borderRadius={8}
              style={{ marginTop: 6 }}
            />
          </View>
        </View>
      </View>

      {/* 2. Hero Card Skeleton */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <SkeletonBox
            width={120}
            height={14}
            borderRadius={7}
            style={styles.heroLightPlaceholder}
          />
          <SkeletonBox
            width={32}
            height={32}
            borderRadius={16}
            style={styles.heroLightPlaceholder}
          />
        </View>

        <SkeletonBox
          width="85%"
          height={28}
          borderRadius={8}
          style={[styles.heroLightPlaceholder, { marginTop: 12 }]}
        />
        <SkeletonBox
          width="60%"
          height={28}
          borderRadius={8}
          style={[styles.heroLightPlaceholder, { marginTop: 6 }]}
        />

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          <SkeletonBox
            width={70}
            height={26}
            borderRadius={13}
            style={styles.heroLightPlaceholder}
          />
          <SkeletonBox
            width={130}
            height={26}
            borderRadius={13}
            style={styles.heroLightPlaceholder}
          />
          <SkeletonBox
            width={80}
            height={26}
            borderRadius={13}
            style={styles.heroLightPlaceholder}
          />
        </View>

        {/* White CTA Button Skeleton */}
        <SkeletonBox
          width="100%"
          height={48}
          borderRadius={24}
          style={{ marginTop: 24, backgroundColor: "#FFFFFF" }}
        />
      </View>

      {/* 3. Check-In Card Skeleton */}
      <View style={styles.checkInCard}>
        <View style={styles.checkInHeader}>
          <SkeletonBox width={150} height={12} borderRadius={6} />
          <SkeletonBox width={36} height={36} borderRadius={18} />
        </View>
        <SkeletonBox
          width={200}
          height={24}
          borderRadius={8}
          style={{ marginTop: 8 }}
        />
        <SkeletonBox
          width="100%"
          height={54}
          borderRadius={BorderRadius.lg}
          style={{ marginTop: 16 }}
        />
        <SkeletonBox
          width="100%"
          height={40}
          borderRadius={BorderRadius.lg}
          style={{ marginTop: 12 }}
        />
      </View>

      {/* 4. Club Card Skeleton */}
      <View style={styles.clubCard}>
        <SkeletonBox width={46} height={46} borderRadius={23} />
        <View style={styles.clubContent}>
          <SkeletonBox width={130} height={10} borderRadius={5} />
          <SkeletonBox
            width={180}
            height={16}
            borderRadius={8}
            style={{ marginTop: 6 }}
          />
          <SkeletonBox
            width={100}
            height={10}
            borderRadius={5}
            style={{ marginTop: 6 }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
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
  headerTexts: {
    justifyContent: "center",
  },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.heroAccent,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLightPlaceholder: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  tagsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  checkInCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  checkInHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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
  clubContent: {
    flex: 1,
  },
});
