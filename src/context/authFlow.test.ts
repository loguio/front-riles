import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import {
  authStateFor,
  signInWithPasswordFlow,
  signUpWithPasswordFlow,
  type PasswordAuthClient,
} from "./authFlow";

/**
 * Régression RILES-004 : une connexion (ou inscription) échouée ne doit JAMAIS
 * produire de session / d'utilisateur. Le backend back-riles valide désormais
 * les vrais identifiants et la signature du JWT Supabase, donc une session
 * fabriquée = écran « connecté » + appels API rejetés en 401.
 */

type SignInFn = PasswordAuthClient["signInWithPassword"];
type SignUpFn = PasswordAuthClient["signUp"];

function makeUser(id = "user-uuid-1"): User {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "athlete@riles.app",
    app_metadata: { provider: "email" },
    user_metadata: { name: "Athlete" },
    identities: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  } as User;
}

function makeSession(user: User = makeUser()): Session {
  return {
    access_token: "real-supabase-access-token",
    refresh_token: "real-supabase-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user,
  } as Session;
}

function makeAuthError(message: string, status = 400): AuthError {
  return {
    name: "AuthApiError",
    message,
    status,
    __isAuthError: true,
  } as unknown as AuthError;
}

function fakeAuth(
  overrides: { signInWithPassword?: SignInFn; signUp?: SignUpFn } = {},
): PasswordAuthClient {
  const signInWithPassword: SignInFn =
    overrides.signInWithPassword ??
    (async () => ({
      data: { session: null, user: null },
      error: makeAuthError("Invalid login credentials"),
    }));
  const signUp: SignUpFn =
    overrides.signUp ??
    (async () => ({
      data: { session: null, user: null },
      error: makeAuthError("Invalid signup request"),
    }));

  return { signInWithPassword, signUp };
}

describe("signInWithPasswordFlow — failed login never fabricates a session (RILES-004)", () => {
  it("surfaces the real Supabase error and returns no session", async () => {
    const auth = fakeAuth({
      signInWithPassword: async () => ({
        data: { session: null, user: null },
        error: makeAuthError("Invalid login credentials", 400),
      }),
    });

    const result = await signInWithPasswordFlow(
      auth,
      "  Athlete@Riles.APP ",
      "wrong-password",
    );

    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe("Invalid login credentials");
    expect(result.session).toBeNull();
  });

  it("leaves session, user and isAuthenticated logged out after a failed login", async () => {
    const auth = fakeAuth({
      signInWithPassword: async () => ({
        data: { session: null, user: null },
        error: makeAuthError("Invalid login credentials", 400),
      }),
    });

    const result = await signInWithPasswordFlow(
      auth,
      "athlete@riles.app",
      "wrong-password",
    );
    const state = authStateFor(result.session);

    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("keeps the state logged out when Supabase reports an unconfirmed email", async () => {
    const auth = fakeAuth({
      signInWithPassword: async () => ({
        data: { session: null, user: null },
        error: makeAuthError("Email not confirmed", 403),
      }),
    });

    const result = await signInWithPasswordFlow(
      auth,
      "athlete@riles.app",
      "good-password",
    );
    const state = authStateFor(result.session);

    expect(result.error?.message).toBe("Email not confirmed");
    expect(result.session).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("turns a thrown network error into an error result with no session", async () => {
    const auth = fakeAuth({
      signInWithPassword: async () => {
        throw new Error("Network request failed");
      },
    });

    const result = await signInWithPasswordFlow(
      auth,
      "athlete@riles.app",
      "any-password",
    );

    expect(result.error?.message).toBe("Network request failed");
    expect(result.session).toBeNull();
    expect(authStateFor(result.session).isAuthenticated).toBe(false);
  });

  it("does not return any forged token or user identifier on failure", async () => {
    const auth = fakeAuth({
      signInWithPassword: async () => ({
        data: { session: null, user: null },
        error: makeAuthError("Invalid login credentials", 400),
      }),
    });

    const result = await signInWithPasswordFlow(
      auth,
      "athlete@riles.app",
      "wrong-password",
    );
    const serialized = JSON.stringify(result);

    for (const marker of FORGED_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
  });

  it("still authenticates with the real session returned by Supabase", async () => {
    const realSession = makeSession();
    const auth = fakeAuth({
      signInWithPassword: async () => ({
        data: { session: realSession, user: realSession.user },
        error: null,
      }),
    });

    const result = await signInWithPasswordFlow(
      auth,
      "athlete@riles.app",
      "good-password",
    );
    const state = authStateFor(result.session);

    expect(result.error).toBeNull();
    expect(result.session).toBe(realSession);
    expect(state.user).toBe(realSession.user);
    expect(state.isAuthenticated).toBe(true);
  });
});

describe("signUpWithPasswordFlow — no fallback session (RILES-004)", () => {
  it("reports email confirmation without creating a session", async () => {
    const pendingUser = makeUser();
    const auth = fakeAuth({
      signUp: async () => ({
        data: { session: null, user: pendingUser },
        error: null,
      }),
    });

    const result = await signUpWithPasswordFlow(
      auth,
      "athlete@riles.app",
      "good-password",
      "Athlete",
    );

    expect(result.error).toBeNull();
    expect(result.session).toBeNull();
    expect(result.needsEmailConfirmation).toBe(true);
    expect(authStateFor(result.session).isAuthenticated).toBe(false);
  });

  it("propagates a sign-up error without creating a session", async () => {
    const auth = fakeAuth({
      signUp: async () => ({
        data: { session: null, user: null },
        error: makeAuthError("User already registered", 422),
      }),
    });

    const result = await signUpWithPasswordFlow(
      auth,
      "athlete@riles.app",
      "good-password",
    );

    expect(result.error?.message).toBe("User already registered");
    expect(result.session).toBeNull();
    expect(result.needsEmailConfirmation).toBe(false);
    expect(authStateFor(result.session).isAuthenticated).toBe(false);
  });

  it("turns a thrown error into an error result with no session", async () => {
    const auth = fakeAuth({
      signUp: async () => {
        throw new Error("fetch failed");
      },
    });

    const result = await signUpWithPasswordFlow(
      auth,
      "athlete@riles.app",
      "good-password",
    );

    expect(result.error?.message).toBe("fetch failed");
    expect(result.session).toBeNull();
    expect(authStateFor(result.session).isAuthenticated).toBe(false);
  });

  it("connects with the real session when Supabase returns one", async () => {
    const realSession = makeSession();
    const auth = fakeAuth({
      signUp: async () => ({
        data: { session: realSession, user: realSession.user },
        error: null,
      }),
    });

    const result = await signUpWithPasswordFlow(
      auth,
      "athlete@riles.app",
      "good-password",
    );

    expect(result.error).toBeNull();
    expect(result.session).toBe(realSession);
    expect(result.needsEmailConfirmation).toBe(false);
  });
});

/**
 * Les motifs sont construits par concaténation pour que ce fichier de test ne
 * contienne lui-même aucun de ces marqueurs (il est scanné par le test ci-dessous).
 */
const FORGED_MARKERS = [
  ["dev", "-", "token-"].join(""),
  ["dev", "-", "refresh-token-"].join(""),
  ["dev", "-", "user-"].join(""),
  ["demo", "-", "bearer-token-"].join(""),
];

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("no fabricated session literals remain in the app source", () => {
  it("scans src/ and app/ for forged token / user markers", () => {
    const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
    const files = [
      ...collectSourceFiles(resolve(repoRoot, "src")),
      ...collectSourceFiles(resolve(repoRoot, "app")),
    ];

    expect(files.length).toBeGreaterThan(30);

    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const marker of FORGED_MARKERS) {
        if (content.includes(marker)) {
          offenders.push(`${file} contains ${marker}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
