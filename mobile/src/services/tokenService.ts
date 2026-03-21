import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.wishify.auth';

export const tokenService = {
  async saveAccessToken(token: string): Promise<void> {
    await Keychain.setGenericPassword('access_token', token, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    });
  },

  async getAccessToken(): Promise<string | null> {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    return creds ? creds.password : null;
  },

  async clearTokens(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },
};
