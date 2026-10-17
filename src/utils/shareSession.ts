import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

export interface ShareSessionCardOptions {
  /** Title shown in the native share sheet (Android / web). */
  dialogTitle?: string;
  /** Image format captured from the card. Defaults to "png". */
  format?: "png" | "jpg";
  /** Compression quality for lossy formats, 0..1. Defaults to 1. */
  quality?: number;
}

export const SHARING_UNAVAILABLE = "sharing-unavailable";

/**
 * Captures a rendered view (typically a `SessionShareCard`) to an image and
 * opens the native share sheet. Returns the local image URI.
 *
 * Throws `Error(SHARING_UNAVAILABLE)` when the platform cannot share files.
 */
export async function shareSessionCard(
  cardRef: RefObject<View | null> | number,
  options: ShareSessionCardOptions = {},
): Promise<string> {
  const { dialogTitle, format = "png", quality = 1 } = options;

  const uri = await captureRef(cardRef, { format, quality });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error(SHARING_UNAVAILABLE);
  }

  await Sharing.shareAsync(uri, {
    mimeType: format === "png" ? "image/png" : "image/jpeg",
    UTI: format === "png" ? "public.png" : "public.jpeg",
    dialogTitle,
  });

  return uri;
}
