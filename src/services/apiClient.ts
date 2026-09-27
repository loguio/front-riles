import { getBaseUrl, getUserId, getAuthToken, API_CONFIG } from "../config/api";

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

class ApiClient {
  /**
   * Effectue un appel HTTP générique typé
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      params,
      timeout = API_CONFIG.timeoutMs,
      headers,
      ...customConfig
    } = options;

    // Construction de l'URL avec query params éventuels
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

    // Préparation des headers
    const requestHeaders: Record<string, string> = {
      ...API_CONFIG.headers,
      "x-user-id": getUserId(),
      ...(headers as Record<string, string>),
    };

    const token = getAuthToken();
    if (token) {
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

      // Traitement de la réponse JSON ou vide
      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const responseData = isJson
        ? await response.json()
        : await response.text();

      if (!response.ok) {
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
      }

      return responseData as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error.name === "AbortError") {
        throw new ApiError(
          `Délai d'attente réseau dépassé (${timeout}ms) pour ${endpoint}`,
          408,
          null,
          true,
        );
      }

      throw new ApiError(
        error.message || "Erreur de connexion réseau avec le serveur NestJS",
        0,
        null,
        true,
      );
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
