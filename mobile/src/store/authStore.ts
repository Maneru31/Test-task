import { create } from 'zustand';
import { tokenService } from '@/services/tokenService';
import type { User } from '@/types/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => Promise<void>;
  setAccessToken: (token: string) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,

  initialize: async () => {
    try {
      // Таймаут 5 сек на весь init — keychain может зависнуть в симуляторе
      const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('init timeout')), 5000),
      );
      await Promise.race([
        (async () => {
          const token = await tokenService.getAccessToken();
          if (!token) {
            set({ status: 'unauthenticated' });
            return;
          }
          try {
            const { apiClient } = await import('@/api/client');
            const { data } = await apiClient.get<User>('/auth/me');
            set({ status: 'authenticated', user: data, accessToken: token });
          } catch {
            // Токен просрочен, refresh недоступен (in-memory cookie пуст)
            await tokenService.clearTokens();
            set({ status: 'unauthenticated' });
          }
        })(),
        timeout,
      ]);
    } catch {
      // Таймаут или неожиданная ошибка — показываем экран входа
      set({ status: 'unauthenticated' });
    }
  },

  setAuth: async (user, token) => {
    await tokenService.saveAccessToken(token);
    set({ status: 'authenticated', user, accessToken: token });
  },

  setAccessToken: (token) => {
    set({ accessToken: token });
  },

  logout: async () => {
    await tokenService.clearTokens();
    try {
      const { apiClient } = await import('@/api/client');
      await apiClient.post('/auth/logout');
    } catch {
      // Игнорируем ошибку logout (уже разлогинены локально)
    }
    set({ status: 'unauthenticated', user: null, accessToken: null });
  },
}));
