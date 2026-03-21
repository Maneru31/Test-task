// Этап 3: Тесты компонента ReserveButton
// Покрывает: переключение состояний (free/mine/others), вызов мутации, 409 → toast, гостевая проверка.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ReserveButton } from '@/components/public/ReserveButton';

// ─── Моки ────────────────────────────────────────────────────────────────────

const mockReserveMutateAsync = jest.fn();
const mockUnreserveMutateAsync = jest.fn();

jest.mock('@/hooks/useReservations', () => ({
  useReserveItem: jest.fn(() => ({
    mutateAsync: mockReserveMutateAsync,
    isPending: false,
  })),
  useUnreserveItem: jest.fn(() => ({
    mutateAsync: mockUnreserveMutateAsync,
    isPending: false,
  })),
}));

const mockShowToast = jest.fn();
jest.mock('@/store/uiStore', () => ({
  useUiStore: (selector: (s: { showToast: typeof mockShowToast }) => typeof mockShowToast) =>
    selector({ showToast: mockShowToast }),
}));

// По умолчанию: пользователь авторизован — пропускаем проверку гостевой сессии
jest.mock('@/store/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({ status: 'authenticated' })),
  },
}));

jest.mock('@/services/guestService', () => ({
  guestService: { getToken: jest.fn(() => undefined) },
}));

// ─── Тесты ───────────────────────────────────────────────────────────────────

describe('ReserveButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('показывает «Зарезервировать» когда позиция свободна', () => {
    const { getByText } = render(
      <ReserveButton itemId="1" slug="test" isReserved={false} reservedByMe={false} />,
    );
    expect(getByText('Зарезервировать')).toBeTruthy();
  });

  it('показывает «Отменить резерв» когда позиция зарезервирована мной', () => {
    const { getByText } = render(
      <ReserveButton itemId="1" slug="test" isReserved={true} reservedByMe={true} />,
    );
    expect(getByText('Отменить резерв')).toBeTruthy();
  });

  it('показывает «Зарезервировано» (disabled) когда позиция занята чужим', () => {
    const { getByText } = render(
      <ReserveButton itemId="1" slug="test" isReserved={true} reservedByMe={false} />,
    );
    expect(getByText('Зарезервировано')).toBeTruthy();
  });

  it('вызывает reserve.mutateAsync при нажатии на свободную позицию', async () => {
    mockReserveMutateAsync.mockResolvedValueOnce(undefined);

    const { getByText } = render(
      <ReserveButton itemId="item-42" slug="test" isReserved={false} reservedByMe={false} />,
    );

    fireEvent.press(getByText('Зарезервировать'));

    await waitFor(() => {
      expect(mockReserveMutateAsync).toHaveBeenCalledWith('item-42');
    });
  });

  it('вызывает unreserve.mutateAsync при отмене своего резерва', async () => {
    mockUnreserveMutateAsync.mockResolvedValueOnce(undefined);

    const { getByText } = render(
      <ReserveButton itemId="item-42" slug="test" isReserved={true} reservedByMe={true} />,
    );

    fireEvent.press(getByText('Отменить резерв'));

    await waitFor(() => {
      expect(mockUnreserveMutateAsync).toHaveBeenCalledWith('item-42');
    });
  });

  it('показывает toast «Кто-то успел раньше» при 409', async () => {
    const conflictError = { response: { status: 409 } };
    mockReserveMutateAsync.mockRejectedValueOnce(conflictError);

    const { getByText } = render(
      <ReserveButton itemId="1" slug="test" isReserved={false} reservedByMe={false} />,
    );

    fireEvent.press(getByText('Зарезервировать'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Кто-то успел раньше', 'error');
    });
  });

  it('показывает общий toast при других ошибках', async () => {
    mockReserveMutateAsync.mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(
      <ReserveButton itemId="1" slug="test" isReserved={false} reservedByMe={false} />,
    );

    fireEvent.press(getByText('Зарезервировать'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Не удалось выполнить действие', 'error');
    });
  });

  it('вызывает onRequireGuest когда нет сессии (не авторизован + нет guest token)', async () => {
    // Переопределяем: пользователь не авторизован, нет guest token
    const { useAuthStore } = require('@/store/authStore');
    useAuthStore.getState.mockReturnValueOnce({ status: 'unauthenticated' });
    const { guestService } = require('@/services/guestService');
    (guestService.getToken as jest.Mock).mockReturnValueOnce(undefined);

    const onRequireGuest = jest.fn();
    const { getByText } = render(
      <ReserveButton
        itemId="1"
        slug="test"
        isReserved={false}
        reservedByMe={false}
        onRequireGuest={onRequireGuest}
      />,
    );

    fireEvent.press(getByText('Зарезервировать'));

    await waitFor(() => {
      expect(onRequireGuest).toHaveBeenCalled();
    });
    // Мутация не должна вызываться
    expect(mockReserveMutateAsync).not.toHaveBeenCalled();
  });
});
