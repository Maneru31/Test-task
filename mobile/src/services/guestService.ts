import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'guest-store' });
const GUEST_TOKEN_KEY = 'guest_token';
const GUEST_NAME_KEY = 'guest_display_name';

export const guestService = {
  saveSession(token: string, displayName: string): void {
    storage.set(GUEST_TOKEN_KEY, token);
    storage.set(GUEST_NAME_KEY, displayName);
  },

  getToken(): string | undefined {
    return storage.getString(GUEST_TOKEN_KEY);
  },

  getDisplayName(): string | undefined {
    return storage.getString(GUEST_NAME_KEY);
  },

  clearSession(): void {
    storage.delete(GUEST_TOKEN_KEY);
    storage.delete(GUEST_NAME_KEY);
  },
};
