import { RES } from '@/constants/geo';

import { CellIndex } from '@/lib/cellIndex';

import type { LatLng } from '@/types/LatLng';
import type { Courier } from '@/types/Courier';
import type { CourierLookup } from '@/lib/matching';

const METERS_PER_DEGREE_LAT = 111_320;

/** A point `meters` north (positive) or south of `origin`, deterministic unlike `randomOffset` */
export const north = (origin: LatLng, meters: number): LatLng => ({
  lat: origin.lat + meters / METERS_PER_DEGREE_LAT,
  lng: origin.lng,
});

export const courierAt = (
  id: string,
  point: LatLng,
  status: Courier['status'] = 'idle'
): Courier => ({ cell: '', id, ...point, status });

/** An in-memory lookup over a fixed list of couriers, like the store but without the singleton */
export const lookupFor = (
  couriers: Courier[],
  resolution = RES
): CourierLookup => {
  const index = new CellIndex(resolution);
  const byId = new Map(couriers.map((courier) => [courier.id, courier]));
  for (const courier of couriers) index.upsert(courier.id, courier);
  return {
    *couriersInCell(cell) {
      for (const id of index.idsIn(cell)) yield byId.get(id)!;
    },
  };
};
