import MockAdapter from 'axios-mock-adapter';

// Мокаем зависимости до импорта apiClient
jest.mock('react-native-keychain');
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn().mockReturnValue(undefined),
    delete: jest.fn(),
  })),
}));
jest.mock('react-native-config', () => ({ default: {} }));

// Мокаем authStore.logout для теста когда refresh падает
const mockLogout = jest.fn();
jest.mock('@/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      logout: mockLogout,
      setAccessToken: jest.fn(),
    }),
  },
}));

import * as Keychain from 'react-native-keychain';
import { apiClient } from '@/api/client';

const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;

describe('apiClient interceptors', () => {
  let mock: MockAdapter;

  beforeAll(() => {
    // Создаём mock-адаптер на экземпляре apiClient (не на базовом axios)
    mock = new MockAdapter(apiClient);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mock.reset();
    mockKeychain.getGenericPassword.mockResolvedValue({
      username: 'access_token',
      password: 'test-token',
      service: 'com.wishify.auth',
      storage: '',
    });
  });

  afterAll(() => {
    mock.restore();
  });

  describe('request interceptor', () => {
    it('добавляет Authorization header если токен есть', async () => {
      mockKeychain.getGenericPassword.mockResolvedValueOnce({
        username: 'access_token',
        password: 'bearer-123',
        service: 'com.wishify.auth',
        storage: '',
      });

      let capturedHeaders: Record<string, string> = {};
      mock.onGet('/test').reply((config) => {
        capturedHeaders = config.headers as Record<string, string>;
        return [200, {}];
      });

      await apiClient.get('/test');

      expect(capturedHeaders.Authorization).toBe('Bearer bearer-123');
    });

    it('не добавляет Authorization если токена нет', async () => {
      mockKeychain.getGenericPassword.mockResolvedValueOnce(false);

      let capturedHeaders: Record<string, string> = {};
      mock.onGet('/no-token').reply((config) => {
        capturedHeaders = config.headers as Record<string, string>;
        return [200, {}];
      });

      await apiClient.get('/no-token');

      expect(capturedHeaders.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor — 401 → refresh → retry', () => {
    it('при 401 выполняет refresh и повторяет запрос', async () => {
      mockKeychain.getGenericPassword.mockResolvedValue({
        username: 'access_token',
        password: 'old-token',
        service: 'com.wishify.auth',
        storage: '',
      });
      mockKeychain.setGenericPassword.mockResolvedValue(false);

      let callCount = 0;
      mock.onGet('/protected').reply(() => {
        callCount++;
        if (callCount === 1) return [401, {}];
        return [200, { data: 'ok' }];
      });

      mock.onPost('/auth/refresh').reply(200, { access_token: 'new-token' });

      const response = await apiClient.get('/protected');

      expect(response.status).toBe(200);
      expect(callCount).toBe(2);
    });

    it('при неудачном refresh вызывает logout', async () => {
      mockKeychain.getGenericPassword.mockResolvedValue({
        username: 'access_token',
        password: 'expired',
        service: 'com.wishify.auth',
        storage: '',
      });
      mockKeychain.resetGenericPassword.mockResolvedValue(true);

      mock.onGet('/secret').reply(401, {});
      mock.onPost('/auth/refresh').reply(401, {});

      await expect(apiClient.get('/secret')).rejects.toThrow();
      expect(mockLogout).toHaveBeenCalled();
    });

    it('race condition: параллельные 401 делают только один refresh', async () => {
      mockKeychain.getGenericPassword.mockResolvedValue({
        username: 'access_token',
        password: 'old',
        service: 'com.wishify.auth',
        storage: '',
      });
      mockKeychain.setGenericPassword.mockResolvedValue(false);

      let refreshCount = 0;
      mock.onPost('/auth/refresh').reply(() => {
        refreshCount++;
        return [200, { access_token: 'fresh-token' }];
      });

      let reqCount = 0;
      mock.onGet('/resource').reply(() => {
        reqCount++;
        if (reqCount <= 2) return [401, {}]; // первые два вызова — 401
        return [200, {}];
      });

      // Запускаем два параллельных запроса
      await Promise.all([
        apiClient.get('/resource'),
        apiClient.get('/resource'),
      ]);

      // Должен быть ровно один refresh
      expect(refreshCount).toBe(1);
    });

    it('не делает повторный refresh для запроса с _retry=true (INV-03)', async () => {
      mockKeychain.getGenericPassword.mockResolvedValue({
        username: 'access_token',
        password: 'tok',
        service: 'com.wishify.auth',
        storage: '',
      });
      mockKeychain.resetGenericPassword.mockResolvedValue(true);

      // Всегда отвечает 401
      mock.onGet('/loop').reply(401, {});
      mock.onPost('/auth/refresh').reply(200, { access_token: 'new' });

      // Второй запрос (retry) тоже 401 — не должен уйти в бесконечный цикл
      let retryCount = 0;
      mock.onGet('/loop').reply(() => {
        retryCount++;
        return [401, {}];
      });

      await expect(apiClient.get('/loop')).rejects.toBeDefined();
      // Максимум 2 вызова: оригинальный + один retry
      expect(retryCount).toBeLessThanOrEqual(2);
    });
  });
});
