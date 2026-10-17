import React, { useRef, useState } from "react";
import { View, StyleSheet, Alert, StyleProp, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { Colors, Spacing } from "../../constants/theme";
import { Button } from "../ui/Button";
import { WorkoutSession } from "../../types/workout";
import { SessionShareCard } from "./SessionShareCard";
import { shareSessionCard, SHARING_UNAVAILABLE } from "../../utils/shareSession";

export interface ShareableSessionCardProps {
  session: WorkoutSession;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders a `SessionShareCard` together with a share button that captures the
 * card to an image and opens the native share sheet.
 */
export const ShareableSessionCard: React.FC<ShareableSessionCardProps> = ({
  session,
  style,
}) => {
  const { t } = useTranslation(["share", "common"]);
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      await shareSessionCard(cardRef, {
        dialogTitle: t("share:share_dialog_title"),
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message === SHARING_UNAVAILABLE
          ? t("share:share_unavailable")
          : t("share:share_failed");
      Alert.alert(t("share:share_button"), message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <SessionShareCard ref={cardRef} session={session} />
      <Button
        label={t("share:share_button")}
        onPress={handleShare}
        disabled={isSharing}
        icon={<Feather name="share-2" size={16} color={Colors.textWhite} />}
        style={styles.shareButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  shareButton: {
    marginTop: Spacing.lg,
    alignSelf: "stretch",
  },
});
