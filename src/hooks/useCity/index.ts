'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchCity } from '@/lib/api';

import type { CitySnapshot } from '@/types/City';

const POLL_MS = 1000;

/**
 * The visitor's city, polled every second while the tab is visible. Polling
 * keeps it simple; Server-Sent Events would be the upgrade at scale.
 */
export const useCity = () => {
  const [city, setCity] = useState<CitySnapshot | null>(null);
  const [error, setError] = useState<null | string>(null);
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    controller.current = new AbortController();
    try {
      setCity(await fetchCity(controller.current.signal));
      setError(null);
    } catch (caught) {
      if ((caught as Error).name !== 'AbortError')
        setError((caught as Error).message);
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(interval);
      refresh();
      interval = setInterval(refresh, POLL_MS);
    };
    const onVisibility = () => {
      if (document.hidden) clearInterval(interval);
      else start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      controller.current?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  return { city, error, refresh, setCity };
};
