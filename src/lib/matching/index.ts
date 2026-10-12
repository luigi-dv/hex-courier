import { K_MAX, MIN_CANDIDATES, RES } from '@/constants/geo';

import { distanceMeters } from '@/lib/geo';
import { ringCells, toCell } from '@/lib/h3';

import type { LatLng } from '@/types/LatLng';
import type { Courier } from '@/types/Courier';
import type { Candidate, MatchResult, SearchRing } from '@/types/Match';

/** The only thing the matcher needs from storage: who is in a cell */
export interface CourierLookup {
  couriersInCell(cell: string): Iterable<Courier>;
}

interface MatchOptions {
  /** Rings searched after the one that gave enough candidates */
  guardRings?: number;
  kMax?: number;
  minCandidates?: number;
  resolution?: number;
}

const byDistance = (a: Candidate, b: Candidate) =>
  a.distanceMeters - b.distanceMeters ||
  a.courier.id.localeCompare(b.courier.id);

/**
 * Finds idle couriers near `pickup` by expanding H3 rings: k = 0 (the pickup
 * cell), then 1, 2... up to `kMax`, and ranks them by straight-line distance.
 *
 * Once a ring gives `minCandidates`, it searches `guardRings` more (one by
 * default) before stopping.
 * Grid distance is not real distance: a pickup near the edge of its cell can be
 * a few metres from a courier in the next ring, closer than one at the far side
 * of its own ring. The extra ring keeps "nearest wins" true for the top results.
 *
 * Pure: same pickup, same lookup, same result. No clock, no randomness.
 */
export const findNearbyCouriers = (
  pickup: LatLng,
  lookup: CourierLookup,
  {
    guardRings = 1,
    kMax = K_MAX,
    minCandidates = MIN_CANDIDATES,
    resolution = RES,
  }: MatchOptions = {}
): MatchResult => {
  const origin = toCell(pickup, resolution);
  const candidates: Candidate[] = [];
  const rings: SearchRing[] = [];
  let enoughAt: null | number = null;

  for (let k = 0; k <= kMax; k++) {
    const cells = ringCells(origin, k);
    const before = candidates.length;

    for (const cell of cells) {
      for (const courier of lookup.couriersInCell(cell)) {
        if (courier.status !== 'idle') continue;
        candidates.push({
          courier,
          distanceMeters: distanceMeters(pickup, courier),
          ring: k,
        });
      }
    }
    rings.push({ cells, found: candidates.length - before, k });

    if (enoughAt === null && candidates.length >= minCandidates) enoughAt = k;
    if (enoughAt !== null && k >= enoughAt + guardRings) break;
  }

  candidates.sort(byDistance);

  return {
    candidates,
    origin,
    resolution,
    rings,
    ringUsed: enoughAt ?? (candidates.length > 0 ? kMax : null),
  };
};

/**
 * The baseline the benchmark compares against: measure the distance to every
 * idle courier and sort. Correct, simple, and O(n) per order.
 */
export const scanNearbyCouriers = (
  pickup: LatLng,
  couriers: Iterable<Courier>,
  limit = MIN_CANDIDATES
): Candidate[] => {
  const candidates: Candidate[] = [];
  for (const courier of couriers) {
    if (courier.status !== 'idle') continue;
    candidates.push({
      courier,
      distanceMeters: distanceMeters(pickup, courier),
      ring: -1,
    });
  }
  return candidates.sort(byDistance).slice(0, limit);
};
