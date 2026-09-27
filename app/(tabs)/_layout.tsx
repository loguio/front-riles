import React from "react";
import { Tabs } from "expo-router";
import { CustomTabBar } from "../../src/components/navigation/CustomTabBar";
import { Colors } from "../../src/constants/theme";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendrier",
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Running Club",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
        }}
      />
    </Tabs>
  );
}
