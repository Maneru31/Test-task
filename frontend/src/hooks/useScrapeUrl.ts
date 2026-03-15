"use client";

import { useState, useEffect } from "react";
import { scrapeUrl } from "@/lib/listsApi";
import type { ScrapeResult } from "@/types";

/**
 * Debounced hook that calls POST /util/scrape when url changes.
 * Only fires if the URL looks like a valid http(s) URL.
 */
export function useScrapeUrl(url: string, debounceMs = 500) {
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || !/^https?:\/\/.+/.test(trimmed)) {
      setResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await scrapeUrl(trimmed);
        setResult(data);
      } catch {
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [url, debounceMs]);

  return { result, isLoading };
}
