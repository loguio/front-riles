import React, { useEffect } from "react";
import "../src/i18n";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "../src/constants/theme";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { AppProvider, useApp } from "../src/context/AppContext";

function RootNavigation() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { isOnboardingCompleted, isLoading: isAppLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Ne pas rediriger tant que la session Supabase ou les données initiales chargent
    if (isAuthLoading || isAppLoading) return;

    const currentPath = (segments as string[]).join("/");
    const inOnboarding =
      currentPath === "onboarding" ||
      (segments as string[]).includes("onboarding");
    const inAuth =
      currentPath.startsWith("auth") || (segments as string[]).includes("auth");

    // Si on est sur l'écran d'onboarding ou de callback auth, ne jamais interférer
    if (inOnboarding || inAuth) {
      return;
    }

    // Si l'utilisateur n'est pas connecté et n'est pas sur l'onboarding -> rediriger vers l'onboarding
    if (!session) {
      router.replace("/onboarding" as any);
      return;
    }
  }, [
    session,
    isOnboardingCompleted,
    isAuthLoading,
    isAppLoading,
    segments,
    router,
  ]);

  // Écran d'attente lors du chargement de la session pour éviter tout clignotement
  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="chat"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: Colors.background }}>
      <AuthProvider>
        <AppProvider>
          <RootNavigation />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
