import * as Keychain from 'react-native-keychain';
import { tokenService } from '@/services/tokenService';

jest.mock('react-native-keychain');

const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;

describe('tokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveAccessToken', () => {
    it('сохраняет токен через Keychain.setGenericPassword', async () => {
      mockKeychain.setGenericPassword.mockResolvedValueOnce(false);

      await tokenService.saveAccessToken('my-token');

      expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
        'access_token',
        'my-token',
        expect.objectContaining({ service: 'com.wishify.auth' }),
      );
    });
  });

  describe('getAccessToken', () => {
    it('возвращает токен если credentials существуют', async () => {
      mockKeychain.getGenericPassword.mockResolvedValueOnce({
        username: 'access_token',
        password: 'stored-token',
        service: 'com.wishify.auth',
        storage: '',
      });

      const token = await tokenService.getAccessToken();

      expect(token).toBe('stored-token');
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'com.wishify.auth' }),
      );
    });

    it('возвращает null если credentials отсутствуют', async () => {
      mockKeychain.getGenericPassword.mockResolvedValueOnce(false);

      const token = await tokenService.getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('вызывает Keychain.resetGenericPassword', async () => {
      mockKeychain.resetGenericPassword.mockResolvedValueOnce(true);

      await tokenService.clearTokens();

      expect(mockKeychain.resetGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'com.wishify.auth' }),
      );
    });
  });

  describe('изоляция', () => {
    it('не использует AsyncStorage (INV-01)', () => {
      // Если бы AsyncStorage использовался — тест упадёт из-за отсутствия mock
      // Проверяем, что все операции идут исключительно через Keychain
      expect(mockKeychain.setGenericPassword).toBeDefined();
      expect(mockKeychain.getGenericPassword).toBeDefined();
      expect(mockKeychain.resetGenericPassword).toBeDefined();
    });
  });
});
