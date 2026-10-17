import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { shareSessionCard, SHARING_UNAVAILABLE } from "./shareSession";

jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn(),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const captureRefMock = captureRef as unknown as jest.Mock;
const isAvailableMock = Sharing.isAvailableAsync as unknown as jest.Mock;
const shareAsyncMock = Sharing.shareAsync as unknown as jest.Mock;

const cardRef = { current: null };

describe("shareSessionCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    captureRefMock.mockResolvedValue("file:///tmp/card.png");
    isAvailableMock.mockResolvedValue(true);
    shareAsyncMock.mockResolvedValue(undefined);
  });

  it("captures the card and opens the native share sheet", async () => {
    const uri = await shareSessionCard(cardRef, {
      dialogTitle: "Partager ma séance",
    });

    expect(captureRefMock).toHaveBeenCalledWith(cardRef, {
      format: "png",
      quality: 1,
    });
    expect(shareAsyncMock).toHaveBeenCalledWith("file:///tmp/card.png", {
      mimeType: "image/png",
      UTI: "public.png",
      dialogTitle: "Partager ma séance",
    });
    expect(uri).toBe("file:///tmp/card.png");
  });

  it("uses the JPEG mime type for jpg captures", async () => {
    await shareSessionCard(cardRef, { format: "jpg", quality: 0.8 });

    expect(captureRefMock).toHaveBeenCalledWith(cardRef, {
      format: "jpg",
      quality: 0.8,
    });
    expect(shareAsyncMock).toHaveBeenCalledWith(
      "file:///tmp/card.png",
      expect.objectContaining({
        mimeType: "image/jpeg",
        UTI: "public.jpeg",
      }),
    );
  });

  it("throws SHARING_UNAVAILABLE when the platform cannot share files", async () => {
    isAvailableMock.mockResolvedValue(false);

    await expect(shareSessionCard(cardRef)).rejects.toThrow(SHARING_UNAVAILABLE);
    expect(shareAsyncMock).not.toHaveBeenCalled();
  });
});
