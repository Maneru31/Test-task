import { apiClient } from './client';
import type { ScrapeResult } from '@/types/api';

export const scrapeApi = {
  scrapeUrl: (url: string) =>
    apiClient
      .post<ScrapeResult>('/items/scrape', { url })
      .then((r) => r.data),
};
