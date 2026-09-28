import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { ChatMessage, ChatSuggestedAction } from "../../types";
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
} from "../../constants/theme";

interface MessageBubbleProps {
  message: ChatMessage;
  onApplyAction?: (
    actionDetails: string,
    suggestedAction?: ChatSuggestedAction,
    messageId?: string,
  ) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onApplyAction,
}) => {
  const isUser = message.sender === "user";

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.coachContainer,
      ]}
    >
      {/* Coach avatar icon */}
      {!isUser && (
        <View style={styles.coachAvatarCircle}>
          <Ionicons name="sparkles" size={14} color={Colors.textWhite} />
        </View>
      )}

      <View
        style={[
          styles.bubbleWrapper,
          isUser ? styles.userBubbleWrapper : styles.coachBubbleWrapper,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.coachBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.coachText,
            ]}
          >
            {message.text}
          </Text>

          {/* Action button if coach proposed an adjustment or a new life rule */}
          {message.suggestedAction && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                message.suggestedAction.applied && styles.actionBtnApplied,
              ]}
              disabled={message.suggestedAction.applied}
              onPress={() => {
                if (message.suggestedAction && onApplyAction) {
                  onApplyAction(
                    message.suggestedAction.details ||
                      message.suggestedAction.type,
                    message.suggestedAction,
                    message.id,
                  );
                }
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name={
                  message.suggestedAction.applied ? "checkmark-circle" : "flash"
                }
                size={16}
                color={
                  message.suggestedAction.applied
                    ? Colors.success
                    : Colors.textWhite
                }
              />
              <Text
                style={[
                  styles.actionBtnText,
                  message.suggestedAction.applied &&
                    styles.actionBtnTextApplied,
                ]}
              >
                {message.suggestedAction.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            isUser ? styles.userTimestamp : styles.coachTimestamp,
          ]}
        >
          {message.timestamp}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    alignItems: "flex-end",
    gap: 8,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  coachContainer: {
    justifyContent: "flex-start",
  },
  coachAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  bubbleWrapper: {
    maxWidth: "82%",
  },
  userBubbleWrapper: {
    alignItems: "flex-end",
  },
  coachBubbleWrapper: {
    alignItems: "flex-start",
  },
  bubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  userBubble: {
    backgroundColor: Colors.textPrimary,
    borderBottomRightRadius: 4,
  },
  coachBubble: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
    ...Shadows.subtle,
  },
  messageText: {
    fontSize: Typography.sizes.base,
    lineHeight: 21,
  },
  userText: {
    color: Colors.textWhite,
    fontWeight: "500",
  },
  coachText: {
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    marginHorizontal: 4,
  },
  userTimestamp: {
    textAlign: "right",
  },
  coachTimestamp: {
    textAlign: "left",
  },
  actionBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    ...Shadows.buttonAccent,
  },
  actionBtnApplied: {
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.success,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionBtnText: {
    color: Colors.textWhite,
    fontSize: Typography.sizes.sm,
    fontWeight: "700",
  },
  actionBtnTextApplied: {
    color: Colors.successText,
  },
});
