'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { POLL_IDLE_MS, POLL_MS } from '@/constants/city';

import { fetchCity } from '@/lib/api';

import type { RefObject } from 'react';
import type { CitySnapshot } from '@/types/City';

const INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * The visitor's city, polled while someone is watching: the tab is visible,
 * the map is on screen and there was input in the last few minutes. Every
 * poll is a CDN request, a function invocation and a Redis read, so nobody
 * watching means no requests. Server-Sent Events would be the upgrade at scale.
 */
export const useCity = (target: RefObject<HTMLElement | null>) => {
  const [city, setCity] = useState<CitySnapshot | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [watching, setWatching] = useState(false);
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

  // Load once on mount, so there is a city to show even before it scrolls in
  useEffect(() => {
    refresh();
    return () => controller.current?.abort();
  }, [refresh]);

  useEffect(() => {
    let onScreen = false;
    let idle = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const update = () => setWatching(onScreen && !idle && !document.hidden);

    const onInput = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idle = true;
        update();
      }, POLL_IDLE_MS);
      if (idle) {
        idle = false;
        update();
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    });
    if (target.current) observer.observe(target.current);

    onInput();
    document.addEventListener('visibilitychange', update);
    for (const name of INPUT_EVENTS)
      window.addEventListener(name, onInput, { passive: true });
    return () => {
      observer.disconnect();
      clearTimeout(idleTimer);
      document.removeEventListener('visibilitychange', update);
      for (const name of INPUT_EVENTS)
        window.removeEventListener(name, onInput);
    };
  }, [target]);

  useEffect(() => {
    if (!watching) return;
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [refresh, watching]);

  return { city, error, refresh, setCity, watching };
};
