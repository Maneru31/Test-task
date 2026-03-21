// Этап 3: Тесты компонента GuestBanner
// Покрывает: скрытие при отсутствии сессии, показ имени при наличии сессии.

import React from 'react';
import { render } from '@testing-library/react-native';
import { GuestBanner } from '@/components/public/GuestBanner';
import { guestService } from '@/services/guestService';

// ─── Моки ────────────────────────────────────────────────────────────────────

jest.mock('@/services/guestService', () => ({
  guestService: {
    getDisplayName: jest.fn(),
  },
}));

const mockGetDisplayName = guestService.getDisplayName as jest.Mock;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// ─── Тесты ───────────────────────────────────────────────────────────────────

describe('GuestBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('не рендерится, если гостевой сессии нет', () => {
    mockGetDisplayName.mockReturnValue(undefined);

    const { queryByTestId } = render(<GuestBanner />);

    expect(queryByTestId('guest-banner')).toBeNull();
  });

  it('рендерится, если гостевая сессия есть', () => {
    mockGetDisplayName.mockReturnValue('Алексей');

    const { getByTestId } = render(<GuestBanner />);

    expect(getByTestId('guest-banner')).toBeTruthy();
  });

  it('показывает имя гостя из сессии', () => {
    mockGetDisplayName.mockReturnValue('Мария');

    const { getByText } = render(<GuestBanner />);

    // Имя отображается в тексте баннера
    expect(getByText('Мария')).toBeTruthy();
  });

  it('показывает кнопку «Войти»', () => {
    mockGetDisplayName.mockReturnValue('Иван');

    const { getByText } = render(<GuestBanner />);

    expect(getByText('Войти')).toBeTruthy();
  });

  it('не рендерится, если displayName — пустая строка', () => {
    mockGetDisplayName.mockReturnValue('');

    // Пустая строка — falsy, баннер не должен показываться
    const { queryByTestId } = render(<GuestBanner />);

    expect(queryByTestId('guest-banner')).toBeNull();
  });
});
