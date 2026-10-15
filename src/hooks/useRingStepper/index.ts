'use client';

import { useCallback, useEffect, useState } from 'react';

const STEP_MS = 520;

/**
 * Which ring of the last search is on screen. Plays forward on its own after a
 * new search (or jumps to the end with reduced motion) and can be stepped by hand.
 */
export const useRingStepper = (
  key: null | string,
  ringCount: number,
  reduceMotion: boolean
) => {
  const last = Math.max(ringCount - 1, 0);
  const [state, setState] = useState({ k: 0, key, playing: true });
  const current =
    state.key === key
      ? state
      : { k: reduceMotion ? last : 0, key, playing: !reduceMotion };

  useEffect(() => {
    if (!key || !current.playing || reduceMotion) return;
    const interval = setInterval(() => {
      setState((previous) => {
        const base =
          previous.key === key ? previous : { k: 0, key, playing: true };
        const k = Math.min(base.k + 1, last);
        return { k, key, playing: k < last };
      });
    }, STEP_MS);
    return () => clearInterval(interval);
  }, [key, current.playing, last, reduceMotion]);

  const go = useCallback(
    (k: number) =>
      setState({ k: Math.max(0, Math.min(k, last)), key, playing: false }),
    [key, last]
  );
  const replay = useCallback(
    () => setState({ k: 0, key, playing: !reduceMotion }),
    [key, reduceMotion]
  );

  return {
    k: current.k,
    last,
    next: () => go(current.k + 1),
    playing: current.playing,
    prev: () => go(current.k - 1),
    replay,
  };
};
