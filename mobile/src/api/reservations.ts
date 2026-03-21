import { apiClient } from './client';

export const reservationsApi = {
  reserve: (itemId: string) => apiClient.post(`/items/${itemId}/reserve`),

  release: (itemId: string) => apiClient.delete(`/items/${itemId}/reserve`),
};
