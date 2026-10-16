'use client';

import { useEffect, useRef } from 'react';

import { CITY_CENTER } from '@/constants/geo';

import { randomOffset } from '@/lib/geo';

import type { LatLng } from '@/types/LatLng';

const EVERY_MS = 12_000;
const FIRST_AFTER_MS = 900;

interface AutoplayOptions {
  /** Off as soon as the visitor does anything */
  running: boolean;
  /** City loaded, so there is someone to dispatch */
  ready: boolean;
  /** With reduced motion: one order, then stop */
  once: boolean;
  place: (pickup: LatLng, dropoff: LatLng) => Promise<void>;
}

/** A pickup near the centre and a dropoff one or two kilometres away */
export const sampleOrder = () => {
  const pickup = randomOffset(CITY_CENTER, 200 + Math.random() * 1100);
  const dropoff = randomOffset(pickup, 900 + Math.random() * 900);
  return { dropoff, pickup };
};

/**
 * Places a sample order shortly after the page loads and then every twelve
 * seconds, so the first thing a visitor sees is the search working.
 */
export const useAutoplay = ({
  once,
  place,
  ready,
  running,
}: AutoplayOptions) => {
  const placeRef = useRef(place);
  const played = useRef(false);

  useEffect(() => {
    placeRef.current = place;
  }, [place]);

  useEffect(() => {
    if (!running || !ready) return;
    if (once && played.current) return;

    const run = () => {
      played.current = true;
      const { dropoff, pickup } = sampleOrder();
      placeRef.current(pickup, dropoff).catch(() => undefined);
    };
    const first = setTimeout(run, played.current ? EVERY_MS : FIRST_AFTER_MS);
    const interval = once ? undefined : setInterval(run, EVERY_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [once, ready, running]);
};
