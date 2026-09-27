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

// Configuration des identifiants Supabase (avec fallback développement)
const SUPABASE_PROJECT_REF =
  process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF || "bjktawrigqjshmayutac";
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  `https://${SUPABASE_PROJECT_REF}.supabase.co`;

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqa3Rhd3JpZ3Fqc2htYXl1dGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4NTYwMDAsImV4cCI6MjAyNTQzMjAwMH0.sample_dev_anon_key";

if (
  SUPABASE_ANON_KEY.includes("sample_dev_anon_key") ||
  SUPABASE_ANON_KEY.includes("...")
) {
  console.warn(
    "⚠️ [Supabase] Attention : La clé EXPO_PUBLIC_SUPABASE_ANON_KEY n'est pas encore définie dans votre fichier riles/.env. Veuillez copier la clé 'anon public' depuis Supabase Dashboard > Settings > API.",
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
