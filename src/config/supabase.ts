import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient, SupportedStorage } from "@supabase/supabase-js";

/**
 * Adaptateur de stockage sécurisé pour Supabase Auth
 * Utilise Expo SecureStore (iOS Keychain / Android KeyStore) sur mobile,
 * et bascule vers localStorage / mémoire sur le Web.
 */
class LargeSecureStoreAdapter implements SupportedStorage {
  private memoryFallback = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return this.memoryFallback.get(key) ?? null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn(
        `[Supabase SecureStore] Erreur de lecture pour la clé "${key}":`,
        error,
      );
      return this.memoryFallback.get(key) ?? null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
        this.memoryFallback.set(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn(
        `[Supabase SecureStore] Erreur d'écriture pour la clé "${key}":`,
        error,
      );
      this.memoryFallback.set(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
        this.memoryFallback.delete(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(
        `[Supabase SecureStore] Erreur de suppression pour la clé "${key}":`,
        error,
      );
      this.memoryFallback.delete(key);
    }
  }
}

export const secureStorageAdapter = new LargeSecureStoreAdapter();

// Configuration des identifiants Supabase — lecture exclusive de
// l'environnement, aucun fallback en dur (RILES-009 : voir .env.example).
const SUPABASE_PROJECT_REF = process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF;
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (SUPABASE_PROJECT_REF
    ? `https://${SUPABASE_PROJECT_REF}.supabase.co`
    : undefined);
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail fast : sans configuration, l'authentification ne peut pas fonctionner.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "[Supabase] Configuration manquante : définissez EXPO_PUBLIC_SUPABASE_URL (ou EXPO_PUBLIC_SUPABASE_PROJECT_REF) et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env — copiez .env.example pour démarrer.",
  );
}

/**
 * Client officiel Supabase configuré pour React Native / Expo
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web", // Détection automatique sur Web
  },
});
