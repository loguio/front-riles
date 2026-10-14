import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
  Typography,
} from "../src/constants/theme";
import { MessageBubble } from "../src/components/chat/MessageBubble";
import { ChatInput } from "../src/components/chat/ChatInput";
import { QuickSuggestions } from "../src/components/chat/QuickSuggestions";
import { ErrorBanner } from "../src/components/ui/ErrorState";
import { useApp } from "../src/context/AppContext";
import { ChatSuggestedAction } from "../src/types";
import { analytics } from "../src/services";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { from, dateKey, workoutTitle } = useLocalSearchParams<{
    from?: string;
    dateKey?: string;
    workoutTitle?: string;
  }>();
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    chatMessages,
    quickPrompts,
    isCoachTyping,
    chatErrorMessage,
    selectedWorkout,
    sendChatMessage,
    resendLastChatMessage,
    applyCoachAction,
  } = useApp();

  const activeWorkoutTitle = workoutTitle || selectedWorkout?.title;
  const activeDateKey = dateKey || selectedWorkout?.dateKey;

  // Suivi de l'ouverture du chat
  useEffect(() => {
    analytics.trackEvent("chat_session_opened", {
      from: from || "direct",
      has_context_workout: Boolean(activeWorkoutTitle),
      workout_date_key: activeDateKey,
    });
  }, [from, activeWorkoutTitle, activeDateKey]);

  // Auto-scroll on new message or typing
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatMessages, isCoachTyping]);

  const handleSend = (text: string) => {
    analytics.trackEvent("chat_message_sent", {
      message_length: text.length,
      has_context_workout: Boolean(activeWorkoutTitle),
    });
    sendChatMessage(text, {
      activeSessionTitle: activeWorkoutTitle,
      dateKey: activeDateKey,
    });
  };

  const handleApplyAction = async (
    actionDetails: string,
    suggestedAction?: ChatSuggestedAction,
    messageId?: string,
  ) => {
    analytics.trackEvent("chat_coach_action_applied", {
      action_type: suggestedAction?.type || "unknown",
      action_label: suggestedAction?.label,
    });
    await applyCoachAction(
      actionDetails,
      selectedWorkout?.dayNumber,
      suggestedAction,
      messageId,
    );
  };

  const handleBack = () => {
    if (from === "onboarding") {
      router.replace({ pathname: "/onboarding", params: { mode: "review" } });
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* 1. Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.coachHeaderInfo}>
            <View style={styles.coachAvatar}>
              <MaterialCommunityIcons
                name="run"
                size={18}
                color={Colors.textWhite}
              />
            </View>
            <View>
              <Text style={styles.coachName}>Coach Riles IA</Text>
              <View style={styles.onlineStatusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineStatusText}>
                  En ligne • Recalcul dynamique de ton plan
                </Text>
              </View>
            </View>
          </View>

          {from === "onboarding" ? (
            <TouchableOpacity
              style={styles.headerPlanBtn}
              activeOpacity={0.8}
              onPress={() =>
                router.replace({
                  pathname: "/onboarding",
                  params: { mode: "review" },
                })
              }
            >
              <Feather name="calendar" size={14} color={Colors.primary} />
              <Text style={styles.headerPlanBtnText}>Mon plan</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.infoBtn}
              activeOpacity={0.7}
              onPress={() => {}}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* 1bis. Bannière d'accès direct au plan pour le parcours onboarding */}
        {from === "onboarding" && (
          <View style={styles.onboardingReturnBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.onboardingReturnTitle}>
                Discussion sur ton plan
              </Text>
              <Text style={styles.onboardingReturnSubtitle}>
                Ajuste ton volume ou tes préférences, puis valide ton plan.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.onboardingReturnBtn}
              activeOpacity={0.85}
              onPress={() =>
                router.replace({
                  pathname: "/onboarding",
                  params: { mode: "review" },
                })
              }
            >
              <Text style={styles.onboardingReturnBtnText}>Voir le plan</Text>
              <Feather name="arrow-right" size={13} color={Colors.textWhite} />
            </TouchableOpacity>
          </View>
        )}

        {/* 2. Session Context Pill */}
        {(activeWorkoutTitle || selectedWorkout) && (
          <View style={styles.contextBanner}>
            <Ionicons name="flash-outline" size={14} color={Colors.primary} />
            <Text style={styles.contextText} numberOfLines={1}>
              Séance ciblée :{" "}
              <Text style={styles.contextBold}>
                {activeWorkoutTitle || selectedWorkout?.title}
              </Text>
              {activeDateKey ? ` • ${activeDateKey}` : ""}
            </Text>
          </View>
        )}

        {/* 3. Message Stream */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {/* RILES-016 : historique réellement vide => état vide + suggestions
              provenant du backend (aucune conversation pré-scriptée). */}
          {chatMessages.length === 0 && !isCoachTyping && (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateAvatar}>
                <MaterialCommunityIcons
                  name="run"
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.emptyStateTitle}>
                Aucune conversation pour le moment
              </Text>
              <Text style={styles.emptyStateText}>
                Pose ta première question : le coach répond à partir de ton plan
                et de tes séances réelles.
              </Text>
            </View>
          )}

          {chatMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onApplyAction={handleApplyAction}
            />
          ))}

          {/* Typing indicator */}
          {isCoachTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.coachTypingAvatar}>
                <MaterialCommunityIcons
                  name="run"
                  size={13}
                  color={Colors.textWhite}
                />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.typingText}>
                  Le coach analyse ton message et rééquilibre ta semaine...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* 4. Input Bar (sans boutons automatiques rigides : l'utilisateur écrit son message librement) */}
        <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          {/* RILES-015/016 : échec d'envoi visible + renvoi explicite */}
          {chatErrorMessage ? (
            <View style={styles.chatErrorWrapper}>
              <ErrorBanner
                message={chatErrorMessage}
                onRetry={resendLastChatMessage}
                retryLabel="Renvoyer"
              />
            </View>
          ) : null}

          {/* Suggestions issues du backend, affichées sous l'état vide */}
          {chatMessages.length === 0 && quickPrompts.length > 0 && (
            <QuickSuggestions
              prompts={quickPrompts}
              onSelectPrompt={(prompt) => handleSend(prompt.message)}
              disabled={isCoachTyping}
            />
          )}

          <ChatInput
            onSend={handleSend}
            disabled={isCoachTyping}
            placeholder={
              activeWorkoutTitle
                ? `Pose ta question au coach sur « ${activeWorkoutTitle} »...`
                : "Pose ta question, partage tes sensations ou adapte ton plan..."
            }
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.badgeGray,
  },
  coachHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
    marginLeft: Spacing.md,
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.heroAccent,
  },
  coachName: {
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  onlineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  onlineStatusText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  infoBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  headerPlanBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  onboardingReturnBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF5F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE4DC",
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  onboardingReturnTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  onboardingReturnSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  onboardingReturnBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    ...Shadows.subtle,
  },
  onboardingReturnBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textWhite,
  },
  contextBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE4DC",
    paddingHorizontal: Spacing.xl,
    paddingVertical: 8,
    gap: 8,
  },
  contextText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
  contextBold: {
    fontWeight: "700",
    color: Colors.primary,
  },
  messagesScroll: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyStateAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyStateTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  chatErrorWrapper: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  messagesContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  coachTypingAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle,
  },
  typingText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});
