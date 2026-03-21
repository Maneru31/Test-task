// Этап 2: TanStack Query хуки для списков
// useGetLists    — загрузка списка всех вишлистов
// useCreateList  — создание, инвалидирует ['lists']
// useUpdateList  — PATCH, инвалидирует ['lists'] и ['list', id]
// useDeleteList  — оптимистичное удаление: snapshot → rollback on error

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listsApi } from '@/api/lists';
import type { WishList } from '@/types/api';

export const LISTS_KEY = ['lists'] as const;

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useGetLists() {
  return useQuery({
    queryKey: LISTS_KEY,
    queryFn: () => listsApi.getMyLists(),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof listsApi.createList>[0]) =>
      listsApi.createList(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
    },
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: Partial<WishList> }) =>
      listsApi.updateList(listId, data),
    onSuccess: (updatedList) => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['list', updatedList.id] });
    },
  });
}

// Оптимистичное удаление: убирает карточку мгновенно, откатывает при ошибке
export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => listsApi.deleteList(listId),

    onMutate: async (listId) => {
      // Отменяем фоновые рефетчи, чтобы не перезаписать оптимистичное состояние
      await queryClient.cancelQueries({ queryKey: LISTS_KEY });
      const snapshot = queryClient.getQueryData<WishList[]>(LISTS_KEY);
      queryClient.setQueryData<WishList[]>(LISTS_KEY, (old) =>
        old ? old.filter((l) => l.id !== listId) : old,
      );
      return { snapshot };
    },

    onError: (_err, _listId, context) => {
      // Откат на снимок состояния до удаления
      if (context?.snapshot) {
        queryClient.setQueryData(LISTS_KEY, context.snapshot);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
    },
  });
}
