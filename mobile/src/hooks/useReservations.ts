// Этап 3: хуки резервирования позиций публичного списка
// useReserveItem   — оптимистично помечает позицию как занятую; 409 → rollback
// useUnreserveItem — оптимистично снимает резерв; ошибка → rollback
// Оба хука принимают slug: string — для инвалидации правильного кэша публичного списка.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '@/api/reservations';
import { publicListKey } from '@/hooks/usePublicList';
import type { WishList, PublicItem } from '@/types/api';

type PublicListData = WishList & { items: PublicItem[] };

// ─── Reserve ─────────────────────────────────────────────────────────────────

export function useReserveItem(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => reservationsApi.reserve(itemId),

    // Оптимистичное обновление: мгновенно помечаем позицию занятой
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: publicListKey(slug) });
      const snapshot = queryClient.getQueryData<PublicListData>(publicListKey(slug));

      queryClient.setQueryData<PublicListData>(publicListKey(slug), (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === itemId
              ? { ...item, is_reserved: true, reserved_by_me: true }
              : item,
          ),
        };
      });

      return { snapshot };
    },

    // Откат при ошибке (в т.ч. 409 — кто-то успел раньше)
    onError: (_err, _itemId, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(publicListKey(slug), context.snapshot);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: publicListKey(slug) });
    },
  });
}

// ─── Unreserve ───────────────────────────────────────────────────────────────

export function useUnreserveItem(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => reservationsApi.release(itemId),

    // Оптимистичное обновление: мгновенно освобождаем позицию
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: publicListKey(slug) });
      const snapshot = queryClient.getQueryData<PublicListData>(publicListKey(slug));

      queryClient.setQueryData<PublicListData>(publicListKey(slug), (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === itemId
              ? { ...item, is_reserved: false, reserved_by_me: false, reserver_name: null }
              : item,
          ),
        };
      });

      return { snapshot };
    },

    onError: (_err, _itemId, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(publicListKey(slug), context.snapshot);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: publicListKey(slug) });
    },
  });
}
