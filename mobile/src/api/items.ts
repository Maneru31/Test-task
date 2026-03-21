import { apiClient } from './client';
import type { Item } from '@/types/api';

export const itemsApi = {
  createItem: (listId: string, data: Partial<Item>) =>
    apiClient
      .post<Item>(`/lists/${listId}/items`, data)
      .then((r) => r.data),

  updateItem: (listId: string, itemId: string, data: Partial<Item>) =>
    apiClient
      .patch<Item>(`/lists/${listId}/items/${itemId}`, data)
      .then((r) => r.data),

  deleteItem: (listId: string, itemId: string) =>
    apiClient.delete(`/lists/${listId}/items/${itemId}`),

  reorderItems: (listId: string, itemIds: string[]) =>
    apiClient.patch(`/lists/${listId}/items/reorder`, { item_ids: itemIds }),
};
