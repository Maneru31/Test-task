// Этап 3: ReserveButton — кнопка резервирования / отмены резерва
// Состояния:
//   Свободно  → «Зарезервировать»    (primary, активная)
//   Моё       → «Отменить резерв»    (secondary, активная)
//   Чужое     → «Зарезервировано»    (secondary, disabled)
// Haptic (Vibration) на каждый успешный вызов.
// 409 конфликт → toast «Кто-то успел раньше».
// Нет сессии   → вызывает onRequireGuest вместо запроса.

import React from 'react';
import { Vibration } from 'react-native';
import { Button } from '@/components/common/Button';
import { useReserveItem, useUnreserveItem } from '@/hooks/useReservations';
import { useAuthStore } from '@/store/authStore';
import { guestService } from '@/services/guestService';
import { useUiStore } from '@/store/uiStore';

interface ReserveButtonProps {
  itemId: string;
  slug: string;
  isReserved: boolean;
  reservedByMe: boolean;
  /** Вызывается, когда пользователь не авторизован и нет гостевой сессии */
  onRequireGuest?: () => void;
}

export function ReserveButton({
  itemId,
  slug,
  isReserved,
  reservedByMe,
  onRequireGuest,
}: ReserveButtonProps) {
  const reserve = useReserveItem(slug);
  const unreserve = useUnreserveItem(slug);
  const showToast = useUiStore((s) => s.showToast);

  const isLoading = reserve.isPending || unreserve.isPending;

  const handlePress = async () => {
    // Проверяем наличие сессии: auth-токен или guest-токен
    const isAuthenticated = useAuthStore.getState().status === 'authenticated';
    const hasGuestToken = Boolean(guestService.getToken());

    if (!isAuthenticated && !hasGuestToken) {
      onRequireGuest?.();
      return;
    }

    try {
      if (reservedByMe) {
        await unreserve.mutateAsync(itemId);
        Vibration.vibrate(30); // haptic — подтверждение снятия резерва
        showToast('Резерв снят', 'info');
      } else {
        await reserve.mutateAsync(itemId);
        Vibration.vibrate(30); // haptic — подтверждение резервирования
        showToast('Зарезервировано!', 'success');
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      showToast(
        status === 409 ? 'Кто-то успел раньше' : 'Не удалось выполнить действие',
        'error',
      );
    }
  };

  // Позиция занята чужим — показываем disabled-кнопку без действий
  if (isReserved && !reservedByMe) {
    return (
      <Button
        title="Зарезервировано"
        variant="secondary"
        disabled
        onPress={() => {}}
        style={styles.button}
      />
    );
  }

  return (
    <Button
      title={reservedByMe ? 'Отменить резерв' : 'Зарезервировать'}
      variant={reservedByMe ? 'secondary' : 'primary'}
      loading={isLoading}
      onPress={handlePress}
      style={styles.button}
    />
  );
}

// Локальные стили не нужны — Button принимает style prop
const styles = {
  button: { marginTop: 6 },
} as const;
