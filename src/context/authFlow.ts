import type { AuthError, Session, User } from "@supabase/supabase-js";

/**
 * Flux d'authentification email/mot de passe, isolés du runtime React Native
 * afin de pouvoir être testés en headless (vitest) et relus indépendamment du
 * contexte.
 *
 * Règle de sécurité (RILES-004) : ces fonctions ne JAMAIS fabriquer de
 * session. En cas d'échec (identifiants invalides, email non confirmé, erreur
 * réseau…), elles renvoient l'erreur réelle et `session: null`. C'est au
 * contexte d'appliquer l'état déconnecté — jamais de session forgée.
 */

export interface AuthFlowResult {
  error: AuthError | null;
  session: Session | null;
}

export interface SignUpFlowResult extends AuthFlowResult {
  /**
   * `true` quand Supabase a créé le compte mais exige la confirmation par
   * email : aucun n'est délivré, l'utilisateur reste déconnecté.
   */
  needsEmailConfirmation?: boolean;
}

/**
 * Vue structurelle minimale des méthodes Supabase Auth utilisées par les flux.
 * Permet de fournir un double de test sans importer le runtime Supabase.
 */
export interface PasswordAuthClient {
  signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{
    data: { session: Session | null; user?: User | null };
    error: AuthError | null;
  }>;
  signUp(credentials: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown> };
  }): Promise<{
    data: { session: Session | null; user?: User | null };
    error: AuthError | null;
  }>;
}

/**
 * Détat d'authentification dérivé d'une session (ou de son absence).
 * Utilisé par AuthContext pour hydrater `session` / `user` / `isAuthenticated`.
 */
export interface AuthState {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
}

export function authStateFor(session: Session | null): AuthState {
  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.user),
  };
}

/**
 * Connexion email/mot de passe.
 *
 * Échec → `{ error, session: null }` : aucune session n'est fabriquée, le
 * contexte reste déconnecté et l'erreur réelle remonte vers l'UI.
 */
export async function signInWithPasswordFlow(
  auth: PasswordAuthClient,
  email: string,
  password: string,
): Promise<AuthFlowResult> {
  try {
    const { data, error } = await auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return { error, session: null };
    }

    return { error: null, session: data?.session ?? null };
  } catch (err) {
    return { error: err as AuthError, session: null };
  }
}

/**
 * Inscription email/mot de passe.
 *
 * - session Supabase réelle → connecté ;
 * - compte créé mais confirmation email requise → `needsEmailConfirmation`,
 *   aucune session, l'utilisateur reste déconnecté ;
 * - erreur → l'erreur réelle remonte, aucune session.
 */
export async function signUpWithPasswordFlow(
  auth: PasswordAuthClient,
  email: string,
  password: string,
  name?: string,
): Promise<SignUpFlowResult> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const displayName = name || trimmedEmail.split("@")[0];

    const { data, error } = await auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: displayName,
          full_name: displayName,
        },
      },
    });

    if (error) {
      return { error, session: null, needsEmailConfirmation: false };
    }

    if (data?.session) {
      return {
        error: null,
        session: data.session,
        needsEmailConfirmation: false,
      };
    }

    // Pas de session et pas d'erreur : Supabase attend la confirmation par
    // email. On l'annonce explicitement au lieu d'improviser une session.
    return { error: null, session: null, needsEmailConfirmation: true };
  } catch (err) {
    return {
      error: err as AuthError,
      session: null,
      needsEmailConfirmation: false,
    };
  }
}
