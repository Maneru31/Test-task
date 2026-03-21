// MMKV mock — симулируем in-memory хранилище
const store: Record<string, string> = {};

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn((key: string, value: string) => { store[key] = value; }),
    getString: jest.fn((key: string) => store[key]),
    delete: jest.fn((key: string) => { delete store[key]; }),
  })),
}));

import { guestService } from '@/services/guestService';

describe('guestService', () => {
  beforeEach(() => {
    // Очищаем in-memory хранилище между тестами
    Object.keys(store).forEach((k) => delete store[k]);
  });

  describe('saveSession', () => {
    it('сохраняет token и displayName', () => {
      guestService.saveSession('tok-123', 'Иван');

      expect(guestService.getToken()).toBe('tok-123');
      expect(guestService.getDisplayName()).toBe('Иван');
    });
  });

  describe('getToken', () => {
    it('возвращает undefined если сессия не сохранена', () => {
      expect(guestService.getToken()).toBeUndefined();
    });

    it('возвращает сохранённый token', () => {
      guestService.saveSession('abc', 'Test');
      expect(guestService.getToken()).toBe('abc');
    });
  });

  describe('getDisplayName', () => {
    it('возвращает undefined если сессия не сохранена', () => {
      expect(guestService.getDisplayName()).toBeUndefined();
    });

    it('возвращает сохранённое имя', () => {
      guestService.saveSession('tok', 'Мария');
      expect(guestService.getDisplayName()).toBe('Мария');
    });
  });

  describe('clearSession', () => {
    it('удаляет token и displayName', () => {
      guestService.saveSession('tok-999', 'Пётр');
      guestService.clearSession();

      expect(guestService.getToken()).toBeUndefined();
      expect(guestService.getDisplayName()).toBeUndefined();
    });
  });

  describe('изоляция', () => {
    it('использует MMKV, не Keychain (INV-01 — guest токен разрешён в MMKV)', () => {
      // Keychain не должен быть задействован в guestService
      // Если бы он был — jest выдал бы ошибку об отсутствующем mock
      expect(() => guestService.saveSession('t', 'n')).not.toThrow();
    });
  });
});
