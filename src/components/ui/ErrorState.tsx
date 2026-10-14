import React from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
} from "../../constants/theme";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  retryLabel?: string;
}

/**
 * Bandeau d'erreur compact (aucune donnée de repli n'est affichée).
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  isRetrying = false,
  retryLabel = "Réessayer",
}) => (
  <View style={styles.banner}>
    <Feather name="alert-circle" size={18} color="#B91C1C" />
    <Text style={styles.bannerText} numberOfLines={4}>
      {message}
    </Text>
    {onRetry ? (
      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.7}
        disabled={isRetrying}
        style={styles.bannerRetryBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isRetrying ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Text style={styles.retryText}>{retryLabel}</Text>
        )}
      </TouchableOpacity>
    ) : null}
  </View>
);

interface ErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Écran d'erreur plein cadre : remplace le contenu tant que le backend
 * n'a rien renvoyé (pas de skeleton figé, pas de données fabriquées).
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  title = "Données indisponibles",
  onRetry,
  isRetrying = false,
}) => (
  <View style={styles.stateContainer}>
    <View style={styles.stateIcon}>
      <Feather name="cloud-off" size={30} color="#B91C1C" />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateMessage}>{message}</Text>
    {onRetry ? (
      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.8}
        disabled={isRetrying}
        style={styles.stateRetryBtn}
      >
        {isRetrying ? (
          <ActivityIndicator size="small" color={Colors.textWhite} />
        ) : (
          <>
            <Feather name="refresh-cw" size={16} color={Colors.textWhite} />
            <Text style={styles.stateRetryText}>Réessayer</Text>
          </>
        )}
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  banner: {
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
  bannerText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: "#991B1B",
    fontWeight: "600",
  },
  bannerRetryBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  retryText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    fontWeight: "800",
  },
  stateContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  stateTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  stateMessage: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  stateRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  stateRetryText: {
    color: Colors.textWhite,
    fontWeight: "800",
    fontSize: Typography.sizes.sm,
  },
});
