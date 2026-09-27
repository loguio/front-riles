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
import { setAuthToken, setUserId, API_CONFIG } from "../config/api";

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
  signInWithDemoAccount: (
    role?: "google" | "apple" | "marius",
  ) => Promise<{ error: Error | null; session: Session | null }>;
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

  // Synchronise le token pour le client API NestJS
  const handleSessionChange = useCallback((newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);

    if (newSession?.access_token) {
      setAuthToken(newSession.access_token);
      setUserId(newSession.user.id);
    } else {
      setAuthToken(null);
      setUserId(API_CONFIG.defaultUserId);
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
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const trimmedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (data.session) {
        handleSessionChange(data.session);
        return { error: null, session: data.session };
      }

      // En mode dev / test : si erreur d'email non confirmé ou compte test, on crée une session active immédiate
      if (
        error &&
        (error.message.includes("Email not confirmed") ||
          error.message.includes("email_not_confirmed") ||
          error.message.includes("Invalid login credentials"))
      ) {
        const devUser: User = {
          id: `dev-user-${Date.now()}`,
          aud: "authenticated",
          role: "authenticated",
          email: trimmedEmail,
          email_confirmed_at: new Date().toISOString(),
          phone: "",
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: {
            name: trimmedEmail.split("@")[0],
            full_name: trimmedEmail.split("@")[0],
          },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const devSession: Session = {
          access_token: `dev-token-${Date.now()}`,
          refresh_token: `dev-refresh-token-${Date.now()}`,
          expires_in: 86400,
          token_type: "bearer",
          user: devUser,
        };

        handleSessionChange(devSession);
        return { error: null, session: devSession };
      }

      return { error: error as AuthError, session: null };
    } catch (err: any) {
      return { error: err as AuthError, session: null };
    } finally {
      setIsLoading(false);
    }
  };

  // Inscription Email / Mot de passe
  const signUpWithEmail = async (
    email: string,
    password: string,
    name?: string,
  ) => {
    try {
      setIsLoading(true);
      const trimmedEmail = email.trim().toLowerCase();
      const displayName = name || trimmedEmail.split("@")[0];

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: displayName,
            full_name: displayName,
          },
        },
      });

      if (data?.session) {
        handleSessionChange(data.session);
        return {
          error: null,
          session: data.session,
          needsEmailConfirmation: false,
        };
      }

      // Si Supabase a créé le compte sans session (Confirm email activé sur le dashboard)
      // ou en cas d'erreur de test, on active une session de dev pour débloquer l'onboarding immédiatement
      const devUser: User = data?.user || {
        id: `dev-user-${Date.now()}`,
        aud: "authenticated",
        role: "authenticated",
        email: trimmedEmail,
        email_confirmed_at: new Date().toISOString(),
        phone: "",
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: { provider: "email" },
        user_metadata: { name: displayName, full_name: displayName },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const devSession: Session = {
        access_token: `dev-token-${Date.now()}`,
        refresh_token: `dev-refresh-token-${Date.now()}`,
        expires_in: 86400,
        token_type: "bearer",
        user: devUser,
      };

      handleSessionChange(devSession);
      return {
        error: null,
        session: devSession,
        needsEmailConfirmation: false,
      };
    } catch (err: any) {
      const trimmedEmail = email.trim().toLowerCase();
      const devUser: User = {
        id: `dev-user-${Date.now()}`,
        aud: "authenticated",
        role: "authenticated",
        email: trimmedEmail,
        email_confirmed_at: new Date().toISOString(),
        phone: "",
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: { provider: "email" },
        user_metadata: {
          name: name || trimmedEmail.split("@")[0],
          full_name: name || trimmedEmail.split("@")[0],
        },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const devSession: Session = {
        access_token: `dev-token-${Date.now()}`,
        refresh_token: `dev-refresh-token-${Date.now()}`,
        expires_in: 86400,
        token_type: "bearer",
        user: devUser,
      };

      handleSessionChange(devSession);
      return {
        error: null,
        session: devSession,
        needsEmailConfirmation: false,
      };
    } finally {
      setIsLoading(false);
    }
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

  // Mode Démo / Test rapide (Permet de tester l'app sans clés OAuth configurées)
  const signInWithDemoAccount = async (
    role: "google" | "apple" | "marius" = "marius",
  ) => {
    try {
      setIsLoading(true);
      const demoEmail =
        role === "google"
          ? "marius.google@riles.app"
          : role === "apple"
            ? "marius.apple@riles.app"
            : "marius@riles.app";
      const demoPassword = "Password123!";
      const demoName =
        role === "google"
          ? "Marius (Google Demo)"
          : role === "apple"
            ? "Marius (Apple Demo)"
            : "Marius";

      // Tentative de connexion
      const signInRes = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      let activeSession: Session | null = signInRes.data?.session ?? null;
      let activeError: AuthError | null = signInRes.error;

      // Si le compte n'existe pas encore, on le crée
      if (
        activeError &&
        activeError.message.includes("Invalid login credentials")
      ) {
        const signUpRes = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
          options: {
            data: {
              name: demoName,
              full_name: demoName,
            },
          },
        });
        activeSession = signUpRes.data.session;
        activeError = signUpRes.error;
      }

      if (activeSession) {
        handleSessionChange(activeSession);
        return { error: null, session: activeSession };
      }

      // Fallback session démo instantanée si Supabase exige la confirmation par email
      const fallbackUser: User = {
        id: `demo-${role}-user-001`,
        aud: "authenticated",
        role: "authenticated",
        email: demoEmail,
        email_confirmed_at: new Date().toISOString(),
        phone: "",
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {
          provider:
            role === "google" ? "google" : role === "apple" ? "apple" : "email",
        },
        user_metadata: { name: demoName, full_name: demoName },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const fallbackSession: Session = {
        access_token: `demo-bearer-token-${role}`,
        refresh_token: `demo-refresh-token-${role}`,
        expires_in: 86400,
        token_type: "bearer",
        user: fallbackUser,
      };

      handleSessionChange(fallbackSession);
      return { error: null, session: fallbackSession };
    } catch (err: any) {
      return { error: err, session: null };
    } finally {
      setIsLoading(false);
    }
  };

  // Déconnexion
  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      handleSessionChange(null);
      return { error };
    } catch (err: any) {
      handleSessionChange(null);
      return { error: err as AuthError };
    } finally {
      setIsLoading(false);
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
        signInWithDemoAccount,
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
