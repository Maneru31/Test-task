import { apiClient } from './client';
import type { Contribution } from '@/types/api';

export const contributionsApi = {
  contribute: (itemId: string, data: { amount: number; note?: string }) =>
    apiClient
      .post<Contribution>(`/items/${itemId}/contributions`, data)
      .then((r) => r.data),

  getSummary: (itemId: string) =>
    apiClient
      .get(`/items/${itemId}/contributions/summary`)
      .then((r) => r.data),

  deleteContribution: (itemId: string, contributionId: string) =>
    apiClient.delete(`/items/${itemId}/contributions/${contributionId}`),
};
