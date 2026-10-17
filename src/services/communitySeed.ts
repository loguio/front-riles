import { CommunityRun, MonthlyChallenge } from "../types";

/**
 * Graines locales de l'écran Communauté.
 *
 * Elles vivent hors de `src/mock/` : RILES-015 interdit aux services
 * d'importer les fixtures de démonstration. Depuis Phase 5B, le service
 * communautaire consomme l'API réelle (`communityService`, contrat
 * `CONTRACT-community.md`) : ces graines ne sont donc plus lues à l'exécution.
 * Elles sont conservées (et alignées sur les types du contrat) pour la parité
 * avec la baseline master et ne doivent pas être réinjectées dans l'UI.
 */
export const INITIAL_COMMUNITY_RUNS: CommunityRun[] = [
  {
    id: "run-1",
    clubId: "club-nantes",
    clubName: "Running Club Nantes",
    scheduledAt: "2026-10-15T19:00:00.000Z",
    location: "Île de Nantes",
    theme: "Sortie collective du jeudi soir",
    participantCount: 12,
    isJoined: false,
    participants: [],
  },
  {
    id: "run-2",
    clubId: "club-nantes",
    clubName: "Endurance Collective",
    scheduledAt: "2026-10-18T09:30:00.000Z",
    location: "Bords de l'Erdre",
    theme: "Sortie Longue Endurance",
    participantCount: 24,
    isJoined: true,
    participants: [],
  },
];

export const INITIAL_CHALLENGE: MonthlyChallenge = {
  id: "chal-oct",
  title: "100 km sans culpabilité",
  metric: "distance",
  target: 100,
  unit: "km",
  progress: 62,
  progressRatio: 0.62,
  periodStart: "2026-10-01T00:00:00.000Z",
  periodEnd: "2026-10-31T23:59:59.999Z",
};
