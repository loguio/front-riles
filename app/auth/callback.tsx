import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/config/supabase";
import { useAuth } from "../../src/context/AuthContext";
import { useApp } from "../../src/context/AppContext";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/constants/theme";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session } = useAuth();
  const { isOnboardingCompleted } = useApp();
  const hasNavigated = useRef(false);

  const safeNavigate = (completed: boolean) => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    setTimeout(() => {
      if (completed) {
        router.replace("/(tabs)" as any);
      } else {
        router.replace("/onboarding?step=2" as any);
      }
    }, 150);
  };

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        // 1. Sur Web : Extraction des tokens depuis le fragment d'URL #
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const hash = window.location.hash;
          if (hash && hash.includes("access_token")) {
            const searchParams = new URLSearchParams(hash.replace(/^#/, ""));
            const accessToken = searchParams.get("access_token");
            const refreshToken = searchParams.get("refresh_token");

            if (accessToken && refreshToken) {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (!error && data.session && isMounted) {
                safeNavigate(isOnboardingCompleted);
                return;
              }
            }
          }
        }

        // 2. Traitement d'un code OAuth (flux PKCE)
        const code = (params.code as string) || null;
        if (code) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session && isMounted) {
            safeNavigate(isOnboardingCompleted);
            return;
          }
        }

        // 3. Traitement des tokens passés directement en query params
        const accessToken = (params.access_token as string) || null;
        const refreshToken = (params.refresh_token as string) || null;
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data.session && isMounted) {
            safeNavigate(isOnboardingCompleted);
            return;
          }
        }

        // 4. Vérification si la session a déjà été restaurée par Supabase
        const { data: currentSessionData } = await supabase.auth.getSession();
        if (currentSessionData.session && isMounted) {
          safeNavigate(isOnboardingCompleted);
          return;
        }

        // 5. Fallback après délai si aucune session n'est détectée
        setTimeout(() => {
          if (isMounted && !hasNavigated.current) {
            safeNavigate(isOnboardingCompleted);
          }
        }, 1200);
      } catch (err) {
        console.error(
          "[AuthCallback] Erreur lors de la finalisation OAuth :",
          err,
        );
        if (isMounted && !hasNavigated.current) {
          safeNavigate(isOnboardingCompleted);
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
        <Text style={styles.title}>Connexion en cours...</Text>
        <Text style={styles.subtitle}>
          Finalisation de votre authentification
        </Text>

        <TouchableOpacity
          style={styles.retryBtn}
          activeOpacity={0.7}
          onPress={() => safeNavigate(isOnboardingCompleted)}
        >
          <Text style={styles.retryBtnText}>Continuer manuellement</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxl,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  loader: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: "900",
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    fontWeight: "500",
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retryBtnText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: "700",
  },
});
