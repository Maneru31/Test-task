import { apiClient } from './client';
import type { WishList, Item, PublicItem } from '@/types/api';

export const listsApi = {
  getMyLists: () =>
    apiClient.get<WishList[]>('/lists').then((r) => r.data),

  createList: (data: {
    title: string;
    description?: string;
    occasion?: string;
    occasion_date?: string;
  }) => apiClient.post<WishList>('/lists', data).then((r) => r.data),

  getList: (listId: string) =>
    apiClient
      .get<WishList & { items: Item[] }>(`/lists/${listId}`)
      .then((r) => r.data),

  updateList: (listId: string, data: Partial<WishList>) =>
    apiClient.patch<WishList>(`/lists/${listId}`, data).then((r) => r.data),

  deleteList: (listId: string) => apiClient.delete(`/lists/${listId}`),

  getPublicList: (slug: string) =>
    apiClient
      .get<WishList & { items: PublicItem[] }>(`/lists/public/${slug}`)
      .then((r) => r.data),
};
