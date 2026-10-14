import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Platform } from "react-native";
import { Session, User, AuthError } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../config/supabase";
import {
  authStateFor,
  signInWithPasswordFlow,
  signUpWithPasswordFlow,
} from "./authFlow";
import { setAuthToken, setUserId, API_CONFIG } from "../config/api";
import { analytics } from "../services/analytics";

// Assure la complétion des sessions OAuth web/mobile
WebBrowser.maybeCompleteAuthSession();

export interface OAuthResult {
  error: Error | AuthError | null;
  session: Session | null;
  cancelled?: boolean;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null; session: Session | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{
    error: AuthError | Error | null;
    session: Session | null;
    needsEmailConfirmation?: boolean;
  }>;
  signInWithGoogle: () => Promise<OAuthResult>;
  signInWithApple: () => Promise<OAuthResult>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

/**
 * Traduction des erreurs d'authentification Supabase en messages clairs et actionnables
 */
export function formatAuthError(error: any): string {
  if (!error) return "Une erreur inattendue est survenue.";
  const msg = typeof error === "string" ? error : error.message || "";

  if (
    msg.toLowerCase().includes("provider is not enabled") ||
    msg.toLowerCase().includes("unsupported provider") ||
    msg.toLowerCase().includes("provider_is_not_enabled")
  ) {
    return "Ce mode de connexion (Google / Apple) n'est pas encore activé dans votre console Supabase (Authentication > Providers). Vous pouvez utiliser l'authentification Email & Mot de passe ci-dessous.";
  }

  if (
    msg.toLowerCase().includes("invalid login credentials") ||
    msg.toLowerCase().includes("invalid_grant")
  ) {
    return "Identifiants incorrects. Vérifiez votre adresse email et votre mot de passe, ou assurez-vous d'avoir créé votre compte.";
  }

  if (
    msg.toLowerCase().includes("email not confirmed") ||
    msg.toLowerCase().includes("email_not_confirmed")
  ) {
    return "Votre adresse email n'a pas encore été confirmée. Veuillez vérifier votre boîte mail et cliquer sur le lien de confirmation avant de vous connecter.";
  }

  if (
    msg.toLowerCase().includes("user already registered") ||
    msg.toLowerCase().includes("already exists")
  ) {
    return "Un compte existe déjà avec cette adresse email. Basculez sur l'onglet 'Connexion'.";
  }

  if (msg.toLowerCase().includes("password should be at least")) {
    return "Le mot de passe doit comporter au moins 6 caractères.";
  }

  if (
    msg.toLowerCase().includes("rate limit") ||
    msg.toLowerCase().includes("over_email_send_rate_limit")
  ) {
    return "Trop de tentatives récentes. Veuillez patienter quelques instants avant de réessayer.";
  }

  return msg || "Erreur d'authentification.";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronise le token pour le client API NestJS et PostHog
  const handleSessionChange = useCallback((newSession: Session | null) => {
    const nextState = authStateFor(newSession);
    setSession(nextState.session);
    setUser(nextState.user);

    if (nextState.session?.access_token && nextState.user) {
      setAuthToken(nextState.session.access_token);
      setUserId(nextState.user.id);
      analytics.identifyUser(nextState.user.id, {
        email: nextState.user.email,
        name:
          nextState.user.user_metadata?.full_name ||
          nextState.user.user_metadata?.name,
        provider: nextState.user.app_metadata?.provider || "email",
      });
    } else {
      setAuthToken(null);
      setUserId(API_CONFIG.defaultUserId);
      analytics.resetUser();
    }
  }, []);

  // Initialisation de la session au démarrage
  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn(
            "[Auth] Erreur lors de la récupération de la session :",
            error.message,
          );
        }

        if (mounted) {
          handleSessionChange(initialSession);
        }
      } catch (err) {
        console.error("[Auth] Erreur inattendue d'initialisation :", err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeSession();

    // Écoute en temps réel des changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        handleSessionChange(currentSession);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSessionChange]);

  // Connexion Email / Mot de passe
  // RILES-004 : en cas d'échec, aucune session n'est fabriquée — l'erreur
  // réelle de Supabase remonte et l'utilisateur reste déconnecté.
  const signInWithEmail = async (email: string, password: string) => {
    const { error, session } = await signInWithPasswordFlow(
      supabase.auth,
      email,
      password,
    );

    if (session) {
      handleSessionChange(session);
    }

    return { error, session };
  };

  // Inscription Email / Mot de passe
  // RILES-004 : pas de session de secours. Si Supabase exige la confirmation
  // par email, on le signale (needsEmailConfirmation) sans connecter l'user.
  const signUpWithEmail = async (
    email: string,
    password: string,
    name?: string,
  ) => {
    const { error, session, needsEmailConfirmation } =
      await signUpWithPasswordFlow(supabase.auth, email, password, name);

    if (session) {
      handleSessionChange(session);
    }

    return { error, session, needsEmailConfirmation };
  };

  // Traitement générique OAuth (Google / Apple)
  const performOAuth = async (
    provider: "google" | "apple",
  ): Promise<OAuthResult> => {
    try {
      const redirectUrl = Linking.createURL("auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== "web",
        },
      });

      if (error) {
        return { error, session: null };
      }

      // Sur mobile, ouverture de la session WebBrowser sécurisée
      if (Platform.OS !== "web" && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
        );

        // Si l'utilisateur annule ou ferme la fenêtre
        if (result.type === "cancel" || result.type === "dismiss") {
          return { error: null, session: null, cancelled: true };
        }

        if (result.type === "success" && result.url) {
          const parsed = Linking.parse(result.url);
          const queryParams = (parsed.queryParams || {}) as Record<
            string,
            string
          >;

          // Gestion des erreurs dans le callback URL
          if (queryParams.error || queryParams.error_description) {
            const errorMsg = queryParams.error_description || queryParams.error;
            return {
              error: new Error(decodeURIComponent(errorMsg)),
              session: null,
            };
          }

          // Extraction du token depuis queryParams ou hash
          let accessToken: string | undefined = queryParams.access_token;
          let refreshToken: string | undefined = queryParams.refresh_token;

          if (!accessToken && result.url.includes("#")) {
            const hash = result.url.split("#")[1];
            const hashParams = new URLSearchParams(hash);
            accessToken = hashParams.get("access_token") || undefined;
            refreshToken = hashParams.get("refresh_token") || undefined;

            const errDesc = hashParams.get("error_description");
            if (errDesc) {
              return {
                error: new Error(decodeURIComponent(errDesc)),
                session: null,
              };
            }
          }

          if (accessToken && refreshToken) {
            const { data: sessionData, error: setSessionErr } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            if (setSessionErr) return { error: setSessionErr, session: null };
            if (sessionData.session) {
              handleSessionChange(sessionData.session);
              return { error: null, session: sessionData.session };
            }
          }

          // Support flux PKCE (code échange)
          const code =
            queryParams.code ||
            (result.url.includes("code=")
              ? new URLSearchParams(result.url.split("?")[1] || "").get("code")
              : null);

          if (code) {
            const { data: exchangeData, error: exchangeErr } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeErr) return { error: exchangeErr, session: null };
            if (exchangeData.session) {
              handleSessionChange(exchangeData.session);
              return { error: null, session: exchangeData.session };
            }
          }
        }
      }

      return { error: null, session: null };
    } catch (err: any) {
      console.error(`[Auth] Erreur OAuth ${provider} :`, err);
      return { error: err, session: null };
    }
  };

  // Connexion Google OAuth
  const signInWithGoogle = async (): Promise<OAuthResult> => {
    return performOAuth("google");
  };

  // Connexion Apple Auth
  const signInWithApple = async (): Promise<OAuthResult> => {
    return performOAuth("apple");
  };

  // Déconnexion
  const signOut = async () => {
    try {
      analytics.trackEvent("user_signed_out");
      const { error } = await supabase.auth.signOut();
      handleSessionChange(null);
      return { error };
    } catch (err: any) {
      handleSessionChange(null);
      return { error: err as AuthError };
    }
  };

  // Réinitialisation mot de passe
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: Linking.createURL("auth/reset-password"),
        },
      );
      return { error };
    } catch (err: any) {
      return { error: err as AuthError };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        isAuthenticated: !!session?.user,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé au sein d'un AuthProvider");
  }
  return context;
};
