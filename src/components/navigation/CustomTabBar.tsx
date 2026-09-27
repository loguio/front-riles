import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../constants/theme";

export interface CustomTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors: Record<string, { options: Record<string, any> }>;
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
}

interface TabConfig {
  name: string;
  label: string;
  renderIcon: (color: string, focused: boolean) => React.ReactNode;
}

const TABS: TabConfig[] = [
  {
    name: "index",
    label: "Accueil",
    renderIcon: (color) => <Feather name="home" size={24} color={color} />,
  },
  {
    name: "calendar",
    label: "Calendrier",
    renderIcon: (color) => (
      <Ionicons name="calendar-outline" size={24} color={color} />
    ),
  },
  {
    name: "community",
    label: "Running Club",
    renderIcon: (color) => (
      <Ionicons name="trophy-outline" size={24} color={color} />
    ),
  },
  {
    name: "profile",
    label: "Profil",
    renderIcon: (color) => <Feather name="user" size={24} color={color} />,
  },
];

export const CustomTabBar: React.FC<CustomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.content}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];

          const tabConfig = TABS.find((t) => t.name === route.name) || {
            name: route.name,
            label: (options.title as string) || route.name,
            renderIcon: (color: string) => (
              <Feather name="circle" size={24} color={color} />
            ),
          };

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const activeColor = Colors.primary;
          const inactiveColor = Colors.tabInactive;
          const color = isFocused ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isFocused && styles.activeIconWrapper,
                ]}
              >
                {tabConfig.renderIcon(color, isFocused)}
              </View>
              <Text
                style={[
                  styles.label,
                  { color },
                  isFocused && styles.activeLabel,
                ]}
              >
                {tabConfig.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 -4px 12px rgba(15, 23, 42, 0.03)",
      },
    }),
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 44,
    height: 32,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  activeIconWrapper: {
    backgroundColor: Colors.primaryMuted,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: "500",
  },
  activeLabel: {
    fontWeight: "700",
  },
});
