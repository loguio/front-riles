import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import i18n from "../../src/i18n";
import { CommunityRun, MonthlyChallenge } from "../../src/types/community";

jest.mock("../../src/context/AppContext", () => ({
  useApp: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// The real vector-icon sets load fonts through expo-font, which is unavailable
// under Jest; render a lightweight Text node instead.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Icon = (props: { name?: string }) =>
    React.createElement(Text, null, props.name ?? "icon");
  return { Feather: Icon, Ionicons: Icon, MaterialCommunityIcons: Icon };
});

const { useApp } = require("../../src/context/AppContext") as {
  useApp: jest.Mock;
};

const CommunityScreen = require("./community").default;

const baseRun: CommunityRun = {
  id: "run-01",
  clubId: "club-01",
  clubName: "Riles Paris",
  scheduledAt: "2026-10-20T18:30:00.000Z",
  location: "Buttes-Chaumont",
  theme: "Sortie seuil en groupe",
  participantCount: 12,
  isJoined: false,
  participants: [
    { userId: "user-01", name: "Camille D.", initials: "CD", isMe: true },
  ],
};

const baseChallenge: MonthlyChallenge = {
  id: "challenge-01",
  title: "100 km en octobre",
  metric: "distance",
  target: 100,
  unit: "km",
  progress: 42.5,
  progressRatio: 0.425,
  periodStart: "2026-10-01T00:00:00.000Z",
  periodEnd: "2026-10-31T23:59:59.999Z",
};

function mockContext(overrides: Record<string, unknown> = {}) {
  const value = {
    communityRuns: [] as CommunityRun[],
    challenges: [] as MonthlyChallenge[],
    isCommunityLoading: false,
    communityError: null,
    toggleCommunityRun: jest.fn(),
    refreshCommunity: jest.fn(),
    ...overrides,
  };
  useApp.mockReturnValue(value);
  return value;
}

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage("fr");
});

describe("CommunityScreen states", () => {
  it("renders the loading state while community data is fetching", () => {
    mockContext({ isCommunityLoading: true });

    render(<CommunityScreen />);

    expect(screen.getByTestId("community-loading")).toBeTruthy();
    expect(screen.getByText("Chargement des sorties…")).toBeTruthy();
    expect(screen.queryByTestId("community-empty")).toBeNull();
  });

  it("renders the empty state when the API returns no runs", () => {
    mockContext();

    render(<CommunityScreen />);

    expect(screen.getByTestId("community-empty")).toBeTruthy();
    expect(screen.getByText("Aucune sortie pour le moment")).toBeTruthy();
    expect(screen.queryByTestId("community-loading")).toBeNull();
  });

  it("renders the error state and retries on demand", () => {
    const value = mockContext({
      communityError: { kind: "network", status: 0, message: "offline" },
    });

    render(<CommunityScreen />);

    expect(screen.getByTestId("community-error")).toBeTruthy();
    expect(
      screen.getByText("Impossible de charger la communauté"),
    ).toBeTruthy();
    expect(screen.getByText("Vérifie ta connexion et réessaie.")).toBeTruthy();

    fireEvent.press(screen.getByText("Réessayer"));
    expect(value.refreshCommunity).toHaveBeenCalledTimes(1);
  });

  it("renders runs + challenge and toggles participation", () => {
    const value = mockContext({
      communityRuns: [
        baseRun,
        {
          ...baseRun,
          id: "run-02",
          theme: "Sortie longue endurance",
          isJoined: true,
          participantCount: 24,
        },
      ],
      challenges: [baseChallenge],
    });

    render(<CommunityScreen />);

    expect(screen.getByText("Sortie seuil en groupe")).toBeTruthy();
    expect(screen.getByText("Sortie longue endurance")).toBeTruthy();
    expect(screen.getByText("12 participants")).toBeTruthy();
    expect(screen.getByText("100 km en octobre")).toBeTruthy();

    // Featured run is not joined -> join CTA.
    fireEvent.press(screen.getByText("Participer à la sortie"));
    expect(value.toggleCommunityRun).toHaveBeenCalledWith("run-01");

    // Second run is joined -> short "Inscrit" action.
    expect(screen.getByText("Inscrit")).toBeTruthy();
  });

  it("renders every challenge returned by the contract", () => {
    mockContext({
      challenges: [
        baseChallenge,
        { ...baseChallenge, id: "challenge-02", title: "Défi 200 km" },
      ],
    });

    render(<CommunityScreen />);

    expect(screen.getByText("100 km en octobre")).toBeTruthy();
    expect(screen.getByText("Défi 200 km")).toBeTruthy();
  });

  it("renders the inline error banner when data is already displayed", () => {
    mockContext({
      communityRuns: [baseRun],
      communityError: { kind: "network", status: 0, message: "offline" },
    });

    render(<CommunityScreen />);

    expect(screen.getByTestId("community-error-banner")).toBeTruthy();
    expect(screen.getByText("Vérifie ta connexion et réessaie.")).toBeTruthy();
    // The full-screen error state is suppressed because runs are present.
    expect(screen.queryByTestId("community-error")).toBeNull();
  });

  it("renders the English locale", async () => {
    await i18n.changeLanguage("en");
    mockContext({
      communityRuns: [baseRun],
      challenges: [baseChallenge],
    });

    render(<CommunityScreen />);

    expect(screen.getByText("Group runs")).toBeTruthy();
    expect(screen.getByText("Join the run")).toBeTruthy();
    expect(screen.getByText("MONTHLY CHALLENGE")).toBeTruthy();
    expect(screen.getByText("12 participants")).toBeTruthy();
  });
});
