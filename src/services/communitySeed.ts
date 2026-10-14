import { CommunityRun, MonthlyChallenge } from "../types";

/**
 * Graines locales de l'écran Communauté.
 *
 * Elles vivent hors de `src/mock/` : RILES-015 interdit aux services
 * d'importer les fixtures de démonstration. Le service reste un stock local
 * en mémoire (aucun endpoint « communauté » n'existe côté backend pour
 * l'instant) — il n'y a donc aucun chemin « échec réseau => donnée fabriquée ».
 */
export const INITIAL_COMMUNITY_RUNS: CommunityRun[] = [
  {
    id: "run-1",
    tag: "PROCHAINE SORTIE",
    location: "Île de Nantes",
    title: "Sortie collective du jeudi soir",
    description:
      "Allure cool et fractionné doux le long des bords de Loire. Tous niveaux bienvenus !",
    dateLabel: "Jeu. 15 Oct",
    timeLabel: "19h00",
    attendeesCount: 12,
    isUserRegistered: false,
    category: "RUNNING CLUB NANTES",
    pace: "5:30/km",
    distance: "8,5 km",
  },
  {
    id: "run-2",
    tag: "SORTIE LONGUE",
    location: "Bords de l’Erdre",
    title: "Sortie Longue Endurance",
    description:
      "18 km à allure fondamentale (5:45/km). Ravitaillement convivial au retour.",
    dateLabel: "Dim. 18 Oct",
    timeLabel: "09h30",
    attendeesCount: 24,
    isUserRegistered: true,
    category: "ENDURANCE COLLECTIVE",
    pace: "5:45/km",
    distance: "18 km",
  },
];

export const INITIAL_CHALLENGE: MonthlyChallenge = {
  id: "chal-oct",
  badge: "DÉFI OCTOBRE",
  title: "100 km sans culpabilité",
  description:
    "Avance à ton allure. Ce qui compte, c'est la régularité, pas la vitesse.",
  currentKm: 62,
  targetKm: 100,
};
