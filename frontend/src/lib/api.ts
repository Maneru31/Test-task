import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly refresh_token cookie automatically
});

// ─── In-memory token store ────────────────────────────────────────────────────
// access_token NEVER goes to localStorage — kept only in module-level memory.

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ─── Pending refresh guard ────────────────────────────────────────────────────
// One refresh request at a time — all concurrent 401s wait for the same promise.

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await axios.post<{ access_token: string }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const token = res.data.access_token;
      setAccessToken(token);
      return token;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Request interceptor: attach Bearer + X-Guest-Token ──────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    // Fallback: guest token from localStorage (browser-only)
    if (typeof window !== "undefined") {
      const guestToken = localStorage.getItem("guest_token");
      if (guestToken) {
        config.headers["X-Guest-Token"] = guestToken;
      }
    }
  }
  return config;
});

// ─── Response interceptor: transparent 401 → refresh → retry ─────────────────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only retry once and only on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh failed — clear token; caller/AuthContext handles redirect
      setAccessToken(null);
    }

    return Promise.reject(error);
  }
);

export default api;
