import React from "react";
import { render, screen } from "@testing-library/react-native";
import i18n from "../../i18n";
import { SessionShareCard } from "./SessionShareCard";
import { WorkoutSession } from "../../types/workout";

const session: WorkoutSession = {
  id: "session-1",
  dateKey: "2026-10-14",
  dayName: "Mer",
  dayNumber: 14,
  fullDateLabel: "MERCREDI 14 OCTOBRE",
  status: "done",
  isRestDay: false,
  category: "SÉANCE QUALITATIVE",
  title: "Sortie Seuil & Allure Cible",
  duration: "1h15",
  distance: "14 km",
  targetPace: "4:50/km",
  targetZoneLabel: "Zone 3–4",
  targetZoneBpm: "158–172 bpm",
  targetZoneSegments: [],
  pinPositionPercent: 68,
  effortBlocks: [],
  actualDistanceKm: 14.2,
  actualDurationSec: 4620,
  actualPace: "4:47/km",
  actualAvgHeartRate: 162,
};

describe("SessionShareCard", () => {
  it("renders the planned vs executed metrics (FR)", async () => {
    await i18n.changeLanguage("fr");

    render(<SessionShareCard session={session} />);

    // Headers and section labels
    expect(screen.getByText("Ma séance")).toBeTruthy();
    expect(screen.getByText("Séance réalisée")).toBeTruthy();
    expect(screen.getByText("Prévu")).toBeTruthy();
    expect(screen.getByText("Réalisé")).toBeTruthy();
    expect(screen.getByText("Distance")).toBeTruthy();
    expect(screen.getByText("Allure")).toBeTruthy();

    // Planned values
    expect(screen.getByText("14 km")).toBeTruthy();
    expect(screen.getByText("4:50/km")).toBeTruthy();
    expect(screen.getByText("158–172 bpm")).toBeTruthy();

    // Executed values (French decimal separator)
    expect(screen.getByText("14,2 km")).toBeTruthy();
    expect(screen.getByText("1h17")).toBeTruthy();
    expect(screen.getByText("4:47/km")).toBeTruthy();
    expect(screen.getByText("162 bpm")).toBeTruthy();
  });

  it("renders English labels when the language is EN", async () => {
    await i18n.changeLanguage("en");

    render(<SessionShareCard session={session} />);

    expect(screen.getByText("My session")).toBeTruthy();
    expect(screen.getByText("Planned")).toBeTruthy();
    expect(screen.getByText("Executed")).toBeTruthy();
    expect(screen.getByText("14.2 km")).toBeTruthy();
  });

  it("falls back to placeholders for a planned session with no executed data", async () => {
    await i18n.changeLanguage("fr");

    const planned: WorkoutSession = {
      ...session,
      status: "upcoming",
      actualDistanceKm: undefined,
      actualDurationSec: undefined,
      actualPace: undefined,
      actualAvgHeartRate: undefined,
    };

    render(<SessionShareCard session={planned} />);

    expect(screen.getByText("Séance prévue")).toBeTruthy();
    // Distance, pace, duration and avg HR executed cells all fall back to "—".
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });

  it("renders safely when pace and heart rate are null at runtime", async () => {
    await i18n.changeLanguage("fr");

    const partial = {
      ...session,
      actualPace: null,
      actualAvgHeartRate: null,
      actualDistanceKm: null,
    } as unknown as WorkoutSession;

    render(<SessionShareCard session={partial} />);

    // Null executed values must not throw and must show the empty placeholder.
    expect(screen.getByText("Séance réalisée")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });
});
