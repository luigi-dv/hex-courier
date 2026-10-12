import {
  cellToBoundary,
  gridDiskDistances,
  gridRingUnsafe,
  latLngToCell,
} from 'h3-js';

import type { LatLng } from '@/types/LatLng';

export const toCell = ({ lat, lng }: LatLng, resolution: number) =>
  latLngToCell(lat, lng, resolution);

/**
 * Cells at exactly grid distance `k` from `origin` (a hollow ring, k = 0 is the
 * origin itself). Searching ring by ring means no cell is looked up twice.
 *
 * `gridRingUnsafe` is the fast path but throws when a pentagon is in the way.
 * There are only 12 pentagons per resolution and they all sit in the ocean, so
 * a city never hits them, but the fallback keeps the matcher correct anywhere:
 * `gridDiskDistances` handles pentagons and groups the cells by distance.
 */
export const ringCells = (origin: string, k: number): string[] => {
  if (k === 0) return [origin];
  try {
    return gridRingUnsafe(origin, k);
  } catch {
    return gridDiskDistances(origin, k)[k] ?? [];
  }
};

/**
 * Cell outline as `[lat, lng]` pairs, which is what Leaflet wants.
 * Careful: `cellToBoundary(cell, true)` returns GeoJSON order (`[lng, lat]`).
 */
export const cellPolygon = (cell: string): [number, number][] =>
  cellToBoundary(cell) as [number, number][];
