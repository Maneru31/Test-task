// Этап 3: хуки вкладов в групповую покупку
// useAddContribution    — POST /items/{id}/contributions, инвалидирует publicList
// useDeleteContribution — DELETE /items/{id}/contributions/{cid}, инвалидирует publicList

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contributionsApi } from '@/api/contributions';
import { publicListKey } from '@/hooks/usePublicList';

// ─── Add contribution ─────────────────────────────────────────────────────────

export function useAddContribution(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, amount, note }: { itemId: string; amount: number; note?: string }) =>
      contributionsApi.contribute(itemId, { amount, note }),

    onSuccess: () => {
      // Обновляем публичный список: сервер пересчитает total_contributed
      queryClient.invalidateQueries({ queryKey: publicListKey(slug) });
    },
  });
}

// ─── Delete contribution ──────────────────────────────────────────────────────

export function useDeleteContribution(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, contributionId }: { itemId: string; contributionId: string }) =>
      contributionsApi.deleteContribution(itemId, contributionId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: publicListKey(slug) });
    },
  });
}
