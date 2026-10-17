/**
 * The figures behind the page's search rules and the guard-ring scenario.
 * Each one runs the real matcher on a seeded city, with and without the rule,
 * so the page never shows a number nobody measured.
 */
import {
  cellToBoundary,
  cellToLatLng,
  getPentagons,
  gridRingUnsafe,
  latLngToCell,
} from 'h3-js';

import {
  CITY_CENTER,
  CITY_RADIUS_M,
  K_MAX,
  MIN_CANDIDATES,
  RES,
} from '@/constants/geo';

import { ringCells } from '@/lib/h3';
import { CellIndex } from '@/lib/cellIndex';
import { createRandom } from '@/lib/random';
import { findNearbyCouriers } from '@/lib/matching';
import { distanceMeters, randomOffset } from '@/lib/geo';

import type { LatLng } from '@/types/LatLng';
import type { Courier } from '@/types/Courier';
import type { CourierLookup } from '@/lib/matching';

const lookupFor = (couriers: Courier[], resolution = RES): CourierLookup => {
  const index = new CellIndex(resolution);
  const byId = new Map(couriers.map((courier) => [courier.id, courier]));
  for (const courier of couriers) index.upsert(courier.id, courier);
  return {
    *couriersInCell(cell) {
      for (const id of index.idsIn(cell)) yield byId.get(id)!;
    },
  };
};

export interface RuleEvidence {
  orders: number;
  guard: { worse: number; extraMeters: number };
  busy: { wouldGoToBusy: number };
  ranking: { notNearest: number };
  reach: { meters: number };
  pentagons: { count: number; error: string };
}

/**
 * Plays `orders` random orders against a seeded fleet of `fleet` couriers
 * (one in five busy) and counts what each rule changes.
 */
export const measureRules = ({
  fleet = 300,
  orders = 2000,
  seed = 11,
} = {}): RuleEvidence => {
  const random = createRandom(seed).next;
  const point = () =>
    randomOffset(CITY_CENTER, Math.sqrt(random()) * CITY_RADIUS_M, random);
  const couriers: Courier[] = Array.from({ length: fleet }, (_, i) => ({
    cell: '',
    id: `c${String(i).padStart(4, '0')}`,
    ...point(),
    status: random() < 0.2 ? 'busy' : 'idle',
  }));
  const lookup = lookupFor(couriers);
  const everyoneIdle = lookupFor(
    couriers.map((courier) => ({ ...courier, status: 'idle' }))
  );

  let worse = 0;
  let extraMeters = 0;
  let wouldGoToBusy = 0;
  let notNearest = 0;

  for (let i = 0; i < orders; i++) {
    const pickup = point();
    const withGuard = findNearbyCouriers(pickup, lookup);
    const withoutGuard = findNearbyCouriers(pickup, lookup, { guardRings: 0 });
    const best = withGuard.candidates[0];
    const naive = withoutGuard.candidates[0];
    if (best && naive && naive.courier.id !== best.courier.id) {
      worse++;
      extraMeters += naive.distanceMeters - best.distanceMeters;
    }

    // Busy couriers counted as free: does the nearest one turn out to be busy?
    const nearestOverall = findNearbyCouriers(pickup, everyoneIdle)
      .candidates[0];
    const original = couriers.find(
      (courier) => courier.id === nearestOverall?.courier.id
    );
    if (original?.status === 'busy') wouldGoToBusy++;

    // Ranked by ring (then id) instead of distance
    const byRing = [...withGuard.candidates].sort(
      (a, b) => a.ring - b.ring || a.courier.id.localeCompare(b.courier.id)
    )[0];
    if (best && byRing && byRing.courier.id !== best.courier.id) notNearest++;
  }

  return {
    busy: { wouldGoToBusy: wouldGoToBusy / orders },
    guard: {
      extraMeters: worse ? extraMeters / worse : 0,
      worse: worse / orders,
    },
    orders,
    pentagons: pentagonEvidence(),
    ranking: { notNearest: notNearest / orders },
    reach: { meters: reachMeters() },
  };
};

/** Distance every direction is guaranteed to be searched: the nearest centre of the first ring past `K_MAX` */
export const reachMeters = (resolution = RES, kMax = K_MAX) => {
  const origin = latLngToCell(CITY_CENTER.lat, CITY_CENTER.lng, resolution);
  const [lat, lng] = cellToLatLng(origin);
  return Math.min(
    ...ringCells(origin, kMax + 1).map((cell) => {
      const [cLat, cLng] = cellToLatLng(cell);
      return distanceMeters({ lat, lng }, { lat: cLat, lng: cLng });
    })
  );
};

const pentagonEvidence = () => {
  const pentagons = getPentagons(RES);
  let error = '';
  try {
    gridRingUnsafe(pentagons[0], 1);
  } catch (caught) {
    error = (caught as Error).message;
  }
  return { count: pentagons.length, error };
};

/** Rings needed to reach a courier `meters` north of the centre, and the cells that costs */
export const searchCost = (resolution: number, meters = 1000) => {
  const origin = latLngToCell(CITY_CENTER.lat, CITY_CENTER.lng, resolution);
  const target = randomOffsetNorth(CITY_CENTER, meters);
  const cell = latLngToCell(target.lat, target.lng, resolution);
  let rings = 0;
  while (!ringCells(origin, rings).includes(cell) && rings < 60) rings++;
  return { cells: 3 * rings * (rings + 1) + 1, rings };
};

const randomOffsetNorth = (origin: LatLng, meters: number): LatLng => ({
  lat: origin.lat + meters / 111_320,
  lng: origin.lng,
});

/**
 * The guard-ring scenario: the pickup cell next to the Palace, courier A just
 * across one edge, courier B inside the cell near the opposite edge.
 * `pickup` moves; the result says who each version of the matcher picks.
 */
export const guardScenario = () => {
  const origin = latLngToCell(CITY_CENTER.lat, CITY_CENTER.lng, RES);
  const [centerLat, centerLng] = cellToLatLng(origin);
  const center = { lat: centerLat, lng: centerLng };
  const boundary = cellToBoundary(origin).map(([lat, lng]) => ({ lat, lng }));
  const edgeMid = (i: number) => ({
    lat: (boundary[i].lat + boundary[(i + 1) % 6].lat) / 2,
    lng: (boundary[i].lng + boundary[(i + 1) % 6].lng) / 2,
  });
  const along = (to: LatLng, t: number) => ({
    lat: center.lat + (to.lat - center.lat) * t,
    lng: center.lng + (to.lng - center.lng) * t,
  });

  const a: Courier = {
    cell: '',
    id: 'A',
    ...along(edgeMid(0), 1.12),
    status: 'idle',
  };
  const b: Courier = {
    cell: '',
    id: 'B',
    ...along(edgeMid(3), 0.82),
    status: 'idle',
  };
  const lookup = lookupFor([a, b]);

  return {
    a,
    b,
    boundary,
    center,
    /** Where the pickup starts, and the point it slides toward: the edge next to A */
    edge: edgeMid(0),
    match(pickup: LatLng) {
      const options = { minCandidates: 1 };
      const withGuard = findNearbyCouriers(pickup, lookup, options);
      const withoutGuard = findNearbyCouriers(pickup, lookup, {
        ...options,
        guardRings: 0,
      });
      const pick = (result: typeof withGuard) => result.candidates[0];
      return {
        inOrigin: latLngToCell(pickup.lat, pickup.lng, RES) === origin,
        withGuard: pick(withGuard),
        withoutGuard: pick(withoutGuard),
      };
    },
    /** The six neighbours, for drawing */
    neighbours: ringCells(origin, 1).map((cell) =>
      cellToBoundary(cell).map(([lat, lng]) => ({ lat, lng }))
    ),
    origin,
  };
};

export { MIN_CANDIDATES };
