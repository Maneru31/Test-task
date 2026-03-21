// Этап 4: useListWebSocket — подписка на события WebSocket для конкретного списка
// При событии → queryClient.invalidateQueries (INV-08: НИКОГДА не setQueryData)
// AppState listener → переподключение при возврате в foreground (iOS рвёт WS в фоне)
//
// WS-контракт событий (PLAN.md §Этап 4):
//   item.created / item.updated / item.deleted / item.reordered / list.updated
//     → invalidate ['list', listId]          (для ListDetailScreen владельца)
//   reservation.changed / contribution.added / contribution.removed
//     → invalidate ['publicList', slug]       (для PublicListScreen зрителя)

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { wsManager } from '@/services/wsManager';
import { publicListKey } from '@/hooks/usePublicList';
import { listDetailKey } from '@/hooks/useItems';
import type { WsEvent } from '@/types/api';

/**
 * Подключается к WS-каналу slug и инвалидирует query при событиях.
 *
 * @param slug   Публичный slug списка (ключ WS-канала)
 * @param token  Bearer-токен (опционально; для гостей не нужен)
 */
export function useListWebSocket(slug: string, token?: string): void {
  const queryClient = useQueryClient();

  // Refs для актуальных slug/token внутри AppState-колбэка (stale closure protection)
  const slugRef = useRef(slug);
  const tokenRef = useRef(token);
  useEffect(() => {
    slugRef.current = slug;
    tokenRef.current = token;
  });

  useEffect(() => {
    if (!slug) return;

    wsManager.connect(slug, token);

    // INV-08: только invalidateQueries — никогда setQueryData
    const removeListener = wsManager.addListener((event: WsEvent) => {
      switch (event.type) {
        case 'item.created':
        case 'item.updated':
        case 'item.deleted':
        case 'item.reordered':
        case 'list.updated':
          queryClient.invalidateQueries({ queryKey: listDetailKey(slug) });
          break;
        case 'reservation.changed':
        case 'contribution.added':
        case 'contribution.removed':
          queryClient.invalidateQueries({ queryKey: publicListKey(slug) });
          break;
      }
    });

    // Переподключение при выходе из фона (iOS рвёт WS примерно через 10 мин)
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        wsManager.connect(slugRef.current, tokenRef.current);
      }
    });

    return () => {
      removeListener();
      appStateSub.remove();
      wsManager.disconnect();
    };
  }, [slug, token, queryClient]);
}
