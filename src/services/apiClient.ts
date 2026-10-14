import {
  getBaseUrl,
  getUserId,
  getAuthToken,
  setAuthToken,
  setUserId,
  API_CONFIG,
} from "../config/api";
import { supabase } from "../config/supabase";

export class ApiError extends Error {
  public status: number;
  public data: any;
  public isNetworkError: boolean;

  constructor(
    message: string,
    status = 0,
    data: any = null,
    isNetworkError = false,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeout?: number;
}

/**
 * RILES-042 : backoff exponentiel (200ms puis 400ms) réservé aux GET sur
 * erreur réseau. Les verbes non idempotents ne sont jamais rejoués tout seuls.
 */
const NETWORK_RETRY_DELAYS_MS = [200, 400];

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mémorise le token fraîchement obtenu pour qu'il serve aux requêtes déjà en
 * vol (l'AuthContext reçoit de toute façon l'événement TOKEN_REFRESHED).
 */
function applySessionToken(token: string, userId?: string | null): void {
  setAuthToken(token);
  if (userId) {
    setUserId(userId);
  }
}

/**
 * RILES-042 : rafraîchissement du token Supabase.
 *
 * Un seul refresh partagé à la fois (single-flight) : si dix requêtes reçoivent
 * un 401 pendant le même refresh, elles attendent la même promesse puis se
 * rejouent chacune une fois avec le même jeton frais.
 *
 * @param sentToken jeton qui vient d'être refusé par le serveur
 * @returns le jeton frais, ou `null` si la session est irrécupérable
 */
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(sentToken: string | null): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performTokenRefresh(sentToken).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function performTokenRefresh(
  sentToken: string | null,
): Promise<string | null> {
  // 1) supabase-js a peut-être déjà régénéré la session en arrière-plan
  //    (auto-refresh) : on réutilise ce jeton sans appeler /token à nouveau.
  try {
    const { data } = await supabase.auth.getSession();
    const sessionToken = data?.session?.access_token;
    if (sessionToken && sessionToken !== sentToken) {
      applySessionToken(sessionToken, data?.session?.user?.id);
      return sessionToken;
    }
  } catch (_err) {
    // Lecture locale de session impossible : on tente un refresh explicite.
  }

  // 2) Refresh explicite. En cas d'échec Supabase purge lui-même la session
  //    morte (voir auth-js) : on renvoie `null` pour déclencher la déconnexion.
  try {
    const { data, error } = await supabase.auth.refreshSession();
    const sessionToken = data?.session?.access_token;
    if (error || !sessionToken) {
      return null;
    }
    applySessionToken(sessionToken, data?.session?.user?.id);
    return sessionToken;
  } catch (_err) {
    return null;
  }
}

/**
 * RILES-042 : re-login forcé après un refresh impossible (ou un second 401).
 * Le cache local est purgé de façon synchrone — la requête suivante échoue
 * donc immédiatement en 401 au lieu de rejouer une boucle de refresh.
 */
async function forceLocalLogout(): Promise<void> {
  const alreadyCleared = getAuthToken() === null;
  setAuthToken(null);
  setUserId(null);
  if (alreadyCleared) {
    return;
  }
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (_err) {
    // La session locale peut déjà avoir été purgée par Supabase.
  }
}

async function readBody(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  return isJson ? await response.json() : await response.text();
}

function toNetworkApiError(
  error: any,
  endpoint: string,
  url: string,
  timeout: number,
): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error?.name === "AbortError") {
    return new ApiError(
      `Délai d'attente réseau dépassé (${timeout}ms) pour ${endpoint}`,
      408,
      null,
      true,
    );
  }
  return new ApiError(
    error?.message ||
      `Erreur de connexion réseau avec le serveur NestJS (${url})`,
    0,
    null,
    true,
  );
}

class ApiClient {
  /**
   * Résout le Bearer Token : cache local d'abord, session Supabase ensuite.
   * Sans aucune session, la requête échoue avant même d'atteindre le réseau.
   */
  private async resolveToken(): Promise<string> {
    let token = getAuthToken();

    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          token = data.session.access_token;
          setAuthToken(token);
          if (data.session.user?.id) {
            setUserId(data.session.user.id);
          }
        }
      } catch (_authErr) {
        // Lecture locale de session impossible : on dégrade en erreur
        // d'authentification ci-dessous — aucune identité n'est inventée.
      }
    }

    // RILES-017 : aucune requête sans session réelle. L'identité de repli a
    // été supprimée ; le backend dérive l'utilisateur du JWT seul.
    if (!token) {
      throw new ApiError(
        "Session authentifiée requise : reconnecte-toi pour continuer.",
        401,
        null,
        false,
      );
    }

    return token;
  }

  private buildUrl(
    endpoint: string,
    params?: RequestOptions["params"],
  ): string {
    let url = `${getBaseUrl()}/${endpoint.replace(/^\/+/, "")}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }
    return url;
  }

  /**
   * Effectue un appel HTTP générique typé avec injection automatique du
   * Bearer Token Supabase.
   *
   * RILES-042 : un 401 déclenche un refresh du token puis UN seul replay ;
   * si le refresh échoue (ou si le replay reprend un 401) la session locale
   * est purgée et l'erreur est remontée — jamais de boucle infinie.
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      params,
      timeout = API_CONFIG.timeoutMs,
      headers,
      ...customConfig
    } = options;

    const url = this.buildUrl(endpoint, params);
    const method = String(customConfig.method ?? "GET").toUpperCase();

    let token = await this.resolveToken();
    let currentUid = getUserId();

    // Préparation des headers : token obligatoire, identifiant réel seulement
    const baseHeaders: Record<string, string> = {
      ...API_CONFIG.headers,
      ...(headers as Record<string, string>),
    };

    let networkAttempt = 0;
    let replayedAfterRefresh = false;

    for (;;) {
      const requestHeaders: Record<string, string> = { ...baseHeaders };
      if (currentUid) {
        requestHeaders["x-user-id"] = currentUid;
      }
      if (!requestHeaders["Authorization"]) {
        requestHeaders["Authorization"] = `Bearer ${token}`;
      }

      // Gestion du timeout via AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...customConfig,
          headers: requestHeaders,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseData = await readBody(response);

        if (response.ok) {
          return responseData as T;
        }

        // RILES-042 : 401 → refresh → replay unique.
        if (response.status === 401) {
          if (!replayedAfterRefresh) {
            replayedAfterRefresh = true;
            const freshToken = await refreshAccessToken(token);
            if (freshToken) {
              token = freshToken;
              currentUid = getUserId();
              continue;
            }
          }
          // Refresh impossible ou le serveur refuse encore le jeton frais :
          // on force la reconnexion, sans réessayer.
          await forceLocalLogout();
          throw new ApiError(
            "Session expirée ou révoquée : reconnecte-toi pour continuer.",
            401,
            responseData,
            false,
          );
        }

        const errorMessage =
          (typeof responseData === "object" && responseData?.message) ||
          response.statusText ||
          `HTTP Error ${response.status}`;

        throw new ApiError(
          Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage,
          response.status,
          responseData,
          false,
        );
      } catch (error) {
        clearTimeout(timeoutId);

        // Erreurs HTTP (dont le 401 déjà traité) : jamais relancées, afin
        // qu'un replay ne puisse pas s'enchaîner en boucle.
        if (error instanceof ApiError) {
          throw error;
        }

        const apiError = toNetworkApiError(error, endpoint, url, timeout);

        if (
          method === "GET" &&
          networkAttempt < NETWORK_RETRY_DELAYS_MS.length
        ) {
          networkAttempt += 1;
          await sleep(NETWORK_RETRY_DELAYS_MS[networkAttempt - 1]);
          continue;
        }

        throw apiError;
      }
    }
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
