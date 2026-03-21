import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { apiClient } from './client';
import { API_BASE_URL } from '@/constants/api';
import type { AuthResponse, GuestSessionResponse, User } from '@/types/api';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient
      .post<AuthResponse>('/auth/login', { email, password })
      .then((r) => r.data),

  register: (display_name: string, email: string, password: string) =>
    apiClient
      .post<AuthResponse>('/auth/register', { display_name, email, password })
      .then((r) => r.data),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<User>('/auth/me').then((r) => r.data),

  refresh: () =>
    apiClient
      .post<{ access_token: string }>('/auth/refresh')
      .then((r) => r.data),

  createGuestSession: (display_name: string) =>
    apiClient
      .post<GuestSessionResponse>('/auth/guest', { display_name })
      .then((r) => r.data),

  updateMe: (data: { display_name?: string }) =>
    apiClient.patch<User>('/auth/me', data).then((r) => r.data),
};

export async function startGoogleOAuth(): Promise<string | null> {
  const oauthUrl = `${API_BASE_URL}/auth/google`;
  const redirectScheme = 'wishify://oauth/callback';

  if (await InAppBrowser.isAvailable()) {
    const result = await InAppBrowser.openAuth(oauthUrl, redirectScheme, {
      ephemeralWebSession: true,
      showTitle: false,
      enableUrlBarHiding: true,
    });

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      return url.searchParams.get('access_token');
    }
  } else {
    Linking.openURL(oauthUrl);
  }

  return null;
}
