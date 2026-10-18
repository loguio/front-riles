# Riles — Application mobile (`front-riles`)

[![CI](https://github.com/loguio/front-riles/actions/workflows/ci.yml/badge.svg)](https://github.com/loguio/front-riles/actions/workflows/ci.yml)

Application mobile **Expo / React Native** de Riles : un coach running dont le
plan s'adapte à ta vraie vie. Onboarding calibré sur ton historique Strava /
Garmin, calendrier des séances, check-in RPE, chat avec le coach IA, running
clubs et abonnement Pro.

**Aperçu produit :** <https://web-riles.netlify.app/> — l'app se teste sur
mobile via **Expo Go** (`npx expo start`, puis scan du QR code).

## Stack

| Domaine | Choix |
| :--- | :--- |
| Framework | Expo 52 · React Native 0.76 · Expo Router |
| Langage | TypeScript (strict) |
| Auth & backend | Supabase Auth + API `back-riles` |
| État | React Context (`src/context`) |
| i18n | i18next / react-i18next (FR / EN) |
| Analytics | PostHog React Native |
| Partage | `react-native-view-shot` + `expo-sharing` |

## Démarrage

```bash
npm install
npx expo start          # puis « i » (iOS), « a » (Android) ou scan Expo Go
```

### Variables d'environnement

L'URL de l'API est lue depuis `EXPO_PUBLIC_API_URL`
(voir [`src/config/api.ts`](./src/config/api.ts)) :

```bash
# .env (untracked)
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Sans cette variable, l'app pointe par défaut sur `http://localhost:3000/api/v1`
(et `http://10.0.2.2:3000` sur l'émulateur Android).

## Structure

```text
app/                     # routes Expo Router
├── (tabs)/              # Accueil · Calendrier · Communauté · Profil
├── chat.tsx             # chat coach IA
└── onboarding.tsx       # parcours en 5 étapes
src/
├── components/          # ui, chat, calendar, onboarding, share, billing
├── context/             # AppContext, AuthContext
├── hooks/               # useEntitlement, useProGate
├── i18n/                # locales FR / EN
├── services/            # apiClient, communityService, billingClient…
├── types/               # types partagés
└── utils/               # dateUtils, shareSession, entitlements
```

## Scripts

| Script | Rôle |
| :--- | :--- |
| `npm start` | Démarre Expo |
| `npm run android` / `ios` / `web` | Cible une plateforme |
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm test` | Tests unitaires (**vitest**) |
| `npm run test:rn` | Tests de composants React Native (**jest-expo**) |

## Tests

Deux runners, séparés par extension de fichier :

- **vitest** (`npm test`) — logique pure : `*.test.ts` (services, utils, hooks).
- **jest-expo** (`npm run test:rn`) — rendu de composants : `*.test.tsx`
  (React Native Testing Library).

Les deux tournent en CI, avec `lint`, `type-check` et `format:check`.

## Conventions

- **Aucun emoji.** Pas d'emoji dans l'UI, le code, les commentaires, les
  chaînes i18n, les logs ou la doc. Chaque symbole est une icône
  `@expo/vector-icons` (Feather / Ionicons / MaterialCommunityIcons), colorée
  avec les tokens `Colors`.
- Garde-fou automatique : [`src/noEmoji.test.ts`](./src/noEmoji.test.ts),
  exécuté par `npm test`.

## Liens

- Méta-dépôt : <https://github.com/loguio/riles>
- API : <https://github.com/loguio/back-riles>
- Landing : <https://github.com/loguio/web-riles>
