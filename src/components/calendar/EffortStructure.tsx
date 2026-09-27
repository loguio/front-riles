import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { EffortBlock } from "../../types";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../constants/theme";

interface EffortStructureProps {
  blocks: EffortBlock[];
}

export const EffortStructure: React.FC<EffortStructureProps> = ({ blocks }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header row: title and block count */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Structure de l'effort</Text>
        <Text style={styles.countText}>{blocks.length} blocs</Text>
      </View>

      {/* Visual horizontal bars */}
      <View style={styles.barsRow}>
        {blocks.map((block, index) => {
          let blockColor = Colors.primary;
          if (
            block.type === "warmup" ||
            block.type === "cooldown" ||
            block.type === "recovery"
          ) {
            blockColor = "#FFD4C7";
          } else if (block.type === "interval") {
            blockColor = "#EF4444";
          }

          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  flex: block.flexRatio,
                  backgroundColor: blockColor,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Block labels below bars */}
      <View style={styles.labelsRow}>
        {blocks.map((block, index) => {
          const isFirst = index === 0;
          const isLast = index === blocks.length - 1;

          return (
            <View
              key={index}
              style={[
                styles.labelCol,
                isFirst && { alignItems: "flex-start" },
                !isFirst && !isLast && { alignItems: "center" },
                isLast && { alignItems: "flex-end" },
              ]}
            >
              <Text style={styles.subText}>{block.title}</Text>
              <Text style={styles.mainText}>{block.durationLabel}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.md,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  countText: {
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  barsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: Spacing.md,
  },
  bar: {
    height: 12,
    borderRadius: 6,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  labelCol: {
    flex: 1,
  },
  subText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  mainText: {
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    fontWeight: "700",
    marginTop: 2,
  },
});
