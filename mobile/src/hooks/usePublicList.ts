// Этап 3: useGetPublicList — загрузка публичного списка по slug
// Запрос идёт без Bearer-токена (публичный endpoint).
// X-Guest-Token добавляется автоматически через interceptor в client.ts, если гостевая сессия есть.

import { useQuery } from '@tanstack/react-query';
import { listsApi } from '@/api/lists';

export const publicListKey = (slug: string) => ['publicList', slug] as const;

export function useGetPublicList(slug: string) {
  return useQuery({
    queryKey: publicListKey(slug),
    queryFn: () => listsApi.getPublicList(slug),
    staleTime: 30_000, // 30 секунд: частые переключения не должны сбрасывать кэш
  });
}
