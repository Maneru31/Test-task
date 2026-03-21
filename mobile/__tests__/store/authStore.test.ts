import * as Keychain from 'react-native-keychain';

jest.mock('react-native-keychain');

// Мокаем apiClient — он динамически импортируется в authStore
jest.mock('@/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';

const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;
const mockApi = apiClient as jest.Mocked<typeof apiClient>;

// Хелпер: сбросить store в начальное состояние
function resetStore() {
  useAuthStore.setState({
    status: 'loading',
    user: null,
    accessToken: null,
  });
}

const fakeUser = {
  id: '1',
  email: 'test@example.com',
  display_name: 'Test User',
  avatar_url: null,
};

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  describe('initialize', () => {
    it('idle → unauthenticated если токен отсутствует', async () => {
      mockKeychain.getGenericPassword.mockResolvedValueOnce(false);

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('idle → authenticated если токен есть и GET /auth/me успешен', async () => {
      mockKeychain.getGenericPassword.mockResolvedValueOnce({
        username: 'access_token',
        password: 'valid-token',
        service: 'com.wishify.auth',
        storage: '',
      });
      (mockApi.get as jest.Mock).mockResolvedValueOnce({ data: fakeUser });

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().user).toEqual(fakeUser);
      expect(useAuthStore.getState().accessToken).toBe('valid-token');
    });

    it('idle → unauthenticated если GET /auth/me завершается ошибкой', async () => {
      mockKeychain.getGenericPassword.mockResolvedValueOnce({
        username: 'access_token',
        password: 'expired-token',
        service: 'com.wishify.auth',
        storage: '',
      });
      (mockApi.get as jest.Mock).mockRejectedValueOnce(new Error('401'));
      mockKeychain.resetGenericPassword.mockResolvedValueOnce(true);

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
      expect(mockKeychain.resetGenericPassword).toHaveBeenCalled();
    });
  });

  describe('setAuth', () => {
    it('сохраняет user, token, status = authenticated', async () => {
      mockKeychain.setGenericPassword.mockResolvedValueOnce(false);

      await useAuthStore.getState().setAuth(fakeUser, 'new-token');

      const state = useAuthStore.getState();
      expect(state.status).toBe('authenticated');
      expect(state.user).toEqual(fakeUser);
      expect(state.accessToken).toBe('new-token');
      expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
        'access_token',
        'new-token',
        expect.any(Object),
      );
    });
  });

  describe('logout', () => {
    it('очищает user, token, status = unauthenticated', async () => {
      // Сначала устанавливаем авторизованное состояние
      useAuthStore.setState({ status: 'authenticated', user: fakeUser, accessToken: 'tok' });
      mockKeychain.resetGenericPassword.mockResolvedValueOnce(true);
      (mockApi.post as jest.Mock).mockResolvedValueOnce({});

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.status).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('завершает logout даже если POST /auth/logout упал', async () => {
      useAuthStore.setState({ status: 'authenticated', user: fakeUser, accessToken: 'tok' });
      mockKeychain.resetGenericPassword.mockResolvedValueOnce(true);
      (mockApi.post as jest.Mock).mockRejectedValueOnce(new Error('network'));

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
    });
  });

  describe('переходы статусов', () => {
    it('loading → authenticated при успешном initialize', async () => {
      expect(useAuthStore.getState().status).toBe('loading');

      mockKeychain.getGenericPassword.mockResolvedValueOnce({
        username: 'access_token',
        password: 'tok',
        service: 'com.wishify.auth',
        storage: '',
      });
      (mockApi.get as jest.Mock).mockResolvedValueOnce({ data: fakeUser });

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().status).toBe('authenticated');
    });

    it('loading → unauthenticated при отсутствии токена', async () => {
      expect(useAuthStore.getState().status).toBe('loading');
      mockKeychain.getGenericPassword.mockResolvedValueOnce(false);

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().status).toBe('unauthenticated');
    });
  });
});
