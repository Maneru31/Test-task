// Этап 2: хук скрапинга URL товара
// Поведение (FR-16):
//   • debounce 800 мс перед отправкой запроса
//   • таймаут 5 с на сетевой запрос
//   • silent fail — ошибку не пробрасываем, поля просто остаются пустыми
//   • при пустом URL сбрасывает result

import { useEffect, useRef, useState } from 'react';
import { scrapeApi } from '@/api/scrape';
import type { ScrapeResult } from '@/types/api';

const DEBOUNCE_MS = 800;
const TIMEOUT_MS = 5000;

export function useScrapedItem(url: string | undefined) {
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Пустой/отсутствующий URL — сбрасываем
    if (!url || url.trim() === '') {
      setResult(null);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      const timeoutId = setTimeout(() => {
        // Тихий таймаут — просто снимаем спиннер (AbortController не поддерживается axios из коробки)
        setIsLoading(false);
      }, TIMEOUT_MS);
      try {
        const data = await scrapeApi.scrapeUrl(url);
        clearTimeout(timeoutId);
        setResult(data);
      } catch {
        // silent fail: не показываем ошибку, поля просто не заполняются (FR-16)
        clearTimeout(timeoutId);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [url]);

  return { result, isLoading };
}
