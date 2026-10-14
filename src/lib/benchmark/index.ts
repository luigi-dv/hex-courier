/**
 * H3 ring search vs scanning every courier, on a seeded city. Shared by
 * `npm run benchmark` and the Web Worker behind the page's benchmark, so the
 * page measures exactly what the README reports.
 */
import { CITY_CENTER, RES } from '@/constants/geo';

import { CellIndex } from '@/lib/cellIndex';
import { createRandom } from '@/lib/random';
import { findNearbyCouriers, scanNearbyCouriers } from '@/lib/matching';

import type { LatLng } from '@/types/LatLng';
import type { Courier } from '@/types/Courier';
import type { CourierLookup } from '@/lib/matching';

const METERS_PER_DEGREE_LAT = 111_320;
/** Couriers are spread over this radius around the city centre */
export const BENCHMARK_RADIUS_M = 10_000;

export interface BenchmarkResult {
  couriers: number;
  queries: number;
  scanQueries: number;
  indexMs: number;
  h3: { mean: number; p95: number };
  scan: { mean: number; p95: number };
  /** Share of orders where both approaches picked the same courier */
  agreement: number;
}

interface BenchmarkOptions {
  queries?: number;
  /** Stop scanning after this long; the scan is the slow side at 100k */
  scanBudgetMs?: number;
  seed?: number;
}

const randomPoint = (random: () => number): LatLng => {
  const distance = Math.sqrt(random()) * BENCHMARK_RADIUS_M;
  const angle = random() * 2 * Math.PI;
  return {
    lat: CITY_CENTER.lat + (distance * Math.cos(angle)) / METERS_PER_DEGREE_LAT,
    lng:
      CITY_CENTER.lng +
      (distance * Math.sin(angle)) /
        (METERS_PER_DEGREE_LAT * Math.cos((CITY_CENTER.lat * Math.PI) / 180)),
  };
};

const summarise = (samples: number[]) => {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean =
    sorted.reduce((sum, value) => sum + value, 0) / (sorted.length || 1);
  return { mean, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0 };
};

const time = (run: () => void) => {
  const start = performance.now();
  run();
  return performance.now() - start;
};

export const runBenchmark = (
  size: number,
  { queries = 500, scanBudgetMs = Infinity, seed = size }: BenchmarkOptions = {}
): BenchmarkResult => {
  const random = createRandom(seed).next;
  // One in five couriers is busy, so the matcher has something to skip
  const couriers: Courier[] = Array.from({ length: size }, (_, i) => ({
    cell: '',
    id: `c${i}`,
    ...randomPoint(random),
    status: random() < 0.2 ? 'busy' : 'idle',
  }));

  const index = new CellIndex(RES);
  const byId = new Map(couriers.map((courier) => [courier.id, courier]));
  const indexMs = time(() => {
    for (const courier of couriers) index.upsert(courier.id, courier);
  });
  const lookup: CourierLookup = {
    *couriersInCell(cell) {
      for (const id of index.idsIn(cell)) yield byId.get(id)!;
    },
  };

  const pickups = Array.from({ length: queries }, () => randomPoint(random));
  // Warm up the JIT so the first size isn't penalised
  for (const pickup of pickups.slice(0, 20)) {
    findNearbyCouriers(pickup, lookup);
    scanNearbyCouriers(pickup, couriers);
  }

  const h3Samples: number[] = [];
  const scanSamples: number[] = [];
  let scanTotal = 0;
  let agreements = 0;
  for (const pickup of pickups) {
    let h3Nearest: string | undefined;
    h3Samples.push(
      time(() => {
        h3Nearest = findNearbyCouriers(pickup, lookup).candidates[0]?.courier
          .id;
      })
    );
    if (scanTotal > scanBudgetMs) continue;
    let scanNearest: string | undefined;
    const ms = time(() => {
      scanNearest = scanNearbyCouriers(pickup, couriers)[0]?.courier.id;
    });
    scanSamples.push(ms);
    scanTotal += ms;
    if (h3Nearest === scanNearest) agreements++;
  }

  return {
    agreement: agreements / scanSamples.length,
    couriers: size,
    h3: summarise(h3Samples),
    indexMs,
    queries,
    scan: summarise(scanSamples),
    scanQueries: scanSamples.length,
  };
};
