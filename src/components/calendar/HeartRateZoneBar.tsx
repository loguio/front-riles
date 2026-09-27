import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../constants/theme";

interface HeartRateZoneBarProps {
  label: string;
  bpm: string;
  pinPositionPercent?: number; // 0 to 100
  segments?: {
    color: string;
    flex: number;
  }[];
}

export const HeartRateZoneBar: React.FC<HeartRateZoneBarProps> = ({
  label,
  bpm,
  pinPositionPercent = 68,
  segments = [
    { color: "#93C5FD", flex: 1.2 },
    { color: "#FBBF24", flex: 2 },
    { color: Colors.primary, flex: 2 },
  ],
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>ZONE CARDIAQUE CIBLE</Text>
      <View style={styles.row}>
        <Text style={styles.zoneLabel}>{label}</Text>

        <View style={styles.barAndBpm}>
          {/* Segmented bar */}
          <View style={styles.barContainer}>
            <View style={styles.bar}>
              {segments.map((s, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.segment,
                    { backgroundColor: s.color, flex: s.flex },
                  ]}
                />
              ))}
            </View>

            {/* Pin pointer */}
            <View
              style={[
                styles.pinWrapper,
                { left: `${Math.min(Math.max(pinPositionPercent, 5), 92)}%` },
              ]}
            >
              <View style={styles.pinDot} />
            </View>
          </View>

          <Text style={styles.bpmText}>{bpm}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  zoneLabel: {
    fontSize: Typography.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  barAndBpm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barContainer: {
    width: 84,
    height: 16,
    justifyContent: "center",
    position: "relative",
  },
  bar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  segment: {
    height: "100%",
  },
  pinWrapper: {
    position: "absolute",
    top: 1,
    marginLeft: -7,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.card,
    borderWidth: 3,
    borderColor: "#0F172A",
  },
  bpmText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});
