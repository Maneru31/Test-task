import axios, { AxiosError } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/constants/api';
import { tokenService } from '@/services/tokenService';
import { guestService } from '@/services/guestService';
import { useAuthStore } from '@/store/authStore';

const jar = new CookieJar();

export const apiClient = wrapper(
  axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    jar,
    withCredentials: true,
  })
);

// REQUEST: добавляем токены к каждому запросу
apiClient.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().accessToken ?? await tokenService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const guestToken = guestService.getToken();
  if (guestToken) {
    config.headers['X-Guest-Token'] = guestToken;
  }

  return config;
});

// RESPONSE: 401 → refresh → retry
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => {
              originalRequest.headers!.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await apiClient.post<{ access_token: string }>('/auth/refresh');
        const newToken = data.access_token;

        await tokenService.saveAccessToken(newToken);
        useAuthStore.getState().setAccessToken(newToken);

        refreshQueue.forEach(({ resolve }) => resolve(newToken));
        refreshQueue = [];

        originalRequest.headers!.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        refreshQueue.forEach(({ reject }) => reject(error));
        refreshQueue = [];
        useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
