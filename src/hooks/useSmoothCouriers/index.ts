'use client';

import { useEffect, useRef, useState } from 'react';

import type { Courier } from '@/types/Courier';

const GLIDE_MS = 1000;

/**
 * Positions arrive once a second; this glides each courier from where it was
 * drawn to where the server says it is, so they drive instead of jumping.
 * With reduced motion, positions are used as they arrive.
 */
export const useSmoothCouriers = (
  couriers: Courier[],
  reduceMotion: boolean
) => {
  const [drawn, setDrawn] = useState(couriers);
  const from = useRef(new Map<string, { lat: number; lng: number }>());
  const current = useRef(new Map<string, { lat: number; lng: number }>());

  useEffect(() => {
    if (reduceMotion) {
      current.current = new Map(
        couriers.map((c) => [c.id, { lat: c.lat, lng: c.lng }])
      );
      const frame = requestAnimationFrame(() => setDrawn(couriers));
      return () => cancelAnimationFrame(frame);
    }

    from.current = new Map(current.current);
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min((now - start) / GLIDE_MS, 1);
      const next = couriers.map((courier) => {
        const origin = from.current.get(courier.id) ?? courier;
        const lat = origin.lat + (courier.lat - origin.lat) * t;
        const lng = origin.lng + (courier.lng - origin.lng) * t;
        current.current.set(courier.id, { lat, lng });
        return { ...courier, lat, lng };
      });
      setDrawn(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [couriers, reduceMotion]);

  return drawn;
};
