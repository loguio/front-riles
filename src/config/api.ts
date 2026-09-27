import { Platform } from "react-native";

/**
 * Configuration API Réseau pour Riles Mobile
 * Gère dynamiquement les URLs selon la plateforme d'exécution (Émulateur Android, Simulateur iOS, Web, Appareil physique).
 */

// Port et préfixe par défaut du backend NestJS
const DEFAULT_PORT = 3000;
const API_PREFIX = "api/v1";

/**
 * Résout la baseURL selon l'environnement d'exécution
 */
function resolveBaseUrl(): string {
  // 1. Variable d'environnement Expo explicite si fournie
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Émulateur Android nécessite l'IP passerelle 10.0.2.2
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_PORT}/${API_PREFIX}`;
  }

  // 3. Simulateur iOS, Web ou machine hôte locale
  return `http://localhost:${DEFAULT_PORT}/${API_PREFIX}`;
}

export const API_CONFIG = {
  baseUrl: resolveBaseUrl(),
  defaultUserId: "user-01",
  timeoutMs: 8000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

/**
 * Permet de modifier dynamiquement la baseURL au runtime (ex: pour cibler une IP locale sur appareil physique)
 */
let dynamicBaseUrl = API_CONFIG.baseUrl;
let currentUserId = API_CONFIG.defaultUserId;
let currentAuthToken: string | null = null;

export const getBaseUrl = (): string => dynamicBaseUrl;
export const setBaseUrl = (url: string): void => {
  dynamicBaseUrl = url.replace(/\/+$/, ""); // retire trailing slash
};

export const getUserId = (): string => currentUserId;
export const setUserId = (userId: string): void => {
  currentUserId = userId;
};

export const getAuthToken = (): string | null => currentAuthToken;
export const setAuthToken = (token: string | null): void => {
  currentAuthToken = token;
};
