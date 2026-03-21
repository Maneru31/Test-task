// Этап 2: TanStack Query хуки для позиций (желаний) в списке
// useGetListItems  — загрузка списка + его позиций (GET /lists/{id})
// useCreateItem    — POST, инвалидирует список и дашборд (счётчик)
// useUpdateItem    — PATCH
// useDeleteItem    — оптимистичное удаление (snapshot → rollback)
// useReorderItems  — PATCH reorder, инвалидирует после выполнения

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '@/api/items';
import { listsApi } from '@/api/lists';
import { LISTS_KEY } from '@/hooks/useLists';
import type { Item, WishList } from '@/types/api';

type ListWithItems = WishList & { items: Item[] };

/** Ключ кеша для конкретного списка с позициями */
export function listDetailKey(listId: string) {
  return ['list', listId] as const;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useGetListItems(listId: string) {
  return useQuery({
    queryKey: listDetailKey(listId),
    queryFn: () => listsApi.getList(listId),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateItem(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Item>) => itemsApi.createItem(listId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listDetailKey(listId) });
      // Обновляем счётчик позиций на дашборде
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
    },
  });
}

export function useUpdateItem(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<Item> }) =>
      itemsApi.updateItem(listId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listDetailKey(listId) });
    },
  });
}

// Оптимистичное удаление позиции: убирает карточку мгновенно, откатывает при ошибке
export function useDeleteItem(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => itemsApi.deleteItem(listId, itemId),

    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: listDetailKey(listId) });
      const snapshot = queryClient.getQueryData<ListWithItems>(listDetailKey(listId));
      queryClient.setQueryData<ListWithItems>(listDetailKey(listId), (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((i) => i.id !== itemId) };
      });
      return { snapshot };
    },

    onError: (_err, _itemId, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(listDetailKey(listId), context.snapshot);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listDetailKey(listId) });
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
    },
  });
}

// debounce reorder: берём финальный порядок item_ids в момент выполнения колбэка
export function useReorderItems(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) => itemsApi.reorderItems(listId, itemIds),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listDetailKey(listId) });
    },
  });
}
