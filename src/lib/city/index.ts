import { CITY_CENTER, CITY_RADIUS_M, RES, RESOLUTIONS } from '@/constants/geo';
/**
 * The city as pure functions over plain data: create it, replay time, place
 * and complete orders. No storage and no clock of its own, so it runs the same
 * in a route handler, a test or a script.
 */
import {
  COURIER_COUNT,
  DELIVERY_SPEED_M,
  MAX_ACTIVE_ORDERS,
  MAX_REPLAY_TICKS,
  ORDER_HISTORY,
  TICK_MS,
  WANDER_M,
} from '@/constants/city';

import { toCell } from '@/lib/h3';
import { CellIndex } from '@/lib/cellIndex';
import { findNearbyCouriers } from '@/lib/matching';
import { createRandom, type Random } from '@/lib/random';
import { distanceMeters, moveTowards, randomOffset } from '@/lib/geo';

import type { Order } from '@/types/Order';
import type { LatLng } from '@/types/LatLng';
import type { Courier } from '@/types/Courier';
import type { OrderMatch } from '@/types/Match';
import type { CourierLookup } from '@/lib/matching';
import type { City, CitySnapshot } from '@/types/City';

export type Resolution = (typeof RESOLUTIONS)[number];

const isActive = (order: Order) =>
  order.status === 'assigned' || order.status === 'picked_up';

/** A new city: idle couriers spread around the centre, more of them near it */
export const createCity = (id: string, now: number, seed: number): City => {
  const random = createRandom(seed);
  const couriers: Courier[] = Array.from({ length: COURIER_COUNT }, (_, i) => {
    const point = randomOffset(
      CITY_CENTER,
      Math.sqrt(random.next()) * CITY_RADIUS_M,
      random.next
    );
    return {
      id: `courier-${i + 1}`,
      ...point,
      cell: toCell(point, RES),
      status: 'idle',
    };
  });
  return {
    at: Math.floor(now / TICK_MS) * TICK_MS,
    couriers,
    id,
    nextOrderNumber: 1,
    orders: [],
    seed: random.state,
    version: 0,
  };
};

const findOrder = (city: City, id: string) =>
  city.orders.find((order) => order.id === id);

const findCourier = (city: City, id: string) =>
  city.couriers.find((courier) => courier.id === id);

const deliver = (city: City, order: Order) => {
  order.status = 'delivered';
  const courier = order.courierId
    ? findCourier(city, order.courierId)
    : undefined;
  if (!courier) return;
  courier.lat = order.dropoff.lat;
  courier.lng = order.dropoff.lng;
  courier.status = 'idle';
  delete courier.orderId;
};

/** One second of the city: idle couriers wander, busy ones drive to their stop */
const tick = (city: City, random: Random) => {
  for (const courier of city.couriers) {
    const order = courier.orderId
      ? findOrder(city, courier.orderId)
      : undefined;

    if (!order || !isActive(order)) {
      // Wander, but turn back toward the centre once outside the city radius
      const next =
        distanceMeters(courier, CITY_CENTER) > CITY_RADIUS_M
          ? moveTowards(courier, CITY_CENTER, WANDER_M).point
          : randomOffset(courier, random.next() * WANDER_M, random.next);
      courier.lat = next.lat;
      courier.lng = next.lng;
      continue;
    }

    const target = order.status === 'assigned' ? order.pickup : order.dropoff;
    const { arrived, point } = moveTowards(courier, target, DELIVERY_SPEED_M);
    courier.lat = point.lat;
    courier.lng = point.lng;
    if (!arrived) continue;

    if (order.status === 'assigned') order.status = 'picked_up';
    else deliver(city, order);
  }
};

/**
 * Replays the whole ticks between the city's clock and `now`, in place.
 * Same city, same `now`, same result: the generator state travels with it.
 * Returns how many ticks ran.
 */
export const advanceCity = (city: City, now: number) => {
  const due = Math.floor((now - city.at) / TICK_MS);
  if (due <= 0) return 0;

  const ticks = Math.min(due, MAX_REPLAY_TICKS);
  const random = createRandom(city.seed);
  for (let i = 0; i < ticks; i++) tick(city, random);

  city.seed = random.state;
  // When the replay was capped, the skipped time is dropped, not owed
  city.at += due * TICK_MS;
  for (const courier of city.couriers) courier.cell = toCell(courier, RES);
  return ticks;
};

/**
 * The matcher's view of the city at one resolution. Rebuilt per request: for a
 * city of 30 couriers that is microseconds, and it keeps the stored city
 * plain JSON. A fleet-sized city would keep the index in storage instead.
 */
export const cityLookup = (
  city: City,
  resolution: Resolution
): CourierLookup => {
  const index = new CellIndex(resolution);
  const byId = new Map(city.couriers.map((courier) => [courier.id, courier]));
  for (const courier of city.couriers) index.upsert(courier.id, courier);
  return {
    *couriersInCell(cell) {
      for (const id of index.idsIn(cell)) yield byId.get(id)!;
    },
  };
};

/** Keeps every active order and the newest finished ones */
const trimOrders = (orders: Order[]) => {
  const finished = orders.filter((order) => !isActive(order));
  const drop = new Set(
    finished.slice(0, Math.max(0, finished.length - ORDER_HISTORY))
  );
  return orders.filter((order) => !drop.has(order));
};

interface PlaceOrderInput {
  pickup: LatLng;
  dropoff: LatLng;
  resolution?: Resolution;
  now: number;
}

export type PlaceOrderResult =
  | { error: 'too-many-active'; match?: never }
  | { error?: never; match: OrderMatch };

/** Creates the order, runs the matcher and assigns the nearest idle courier */
export const placeOrder = (
  city: City,
  { dropoff, now, pickup, resolution = RES }: PlaceOrderInput
): PlaceOrderResult => {
  if (city.orders.filter(isActive).length >= MAX_ACTIVE_ORDERS) {
    return { error: 'too-many-active' };
  }

  const order: Order = {
    createdAt: new Date(now).toISOString(),
    dropoff,
    id: `order-${city.nextOrderNumber++}`,
    pickup,
    status: 'unassigned',
  };

  const lookup = cityLookup(city, resolution);
  const start = performance.now();
  const match = findNearbyCouriers(pickup, lookup, { resolution });
  const durationMs = performance.now() - start;

  const chosen = match.candidates[0]?.courier;
  if (chosen) {
    order.status = 'assigned';
    order.courierId = chosen.id;
    chosen.status = 'busy';
    chosen.orderId = order.id;
  }
  city.orders = trimOrders([...city.orders, order]);

  return {
    match: {
      candidates: match.candidates.map(({ courier, distanceMeters, ring }) => ({
        courierId: courier.id,
        distanceMeters,
        ring,
      })),
      durationMs,
      order,
      origin: match.origin,
      resolution: match.resolution,
      rings: match.rings,
      ringUsed: match.ringUsed,
    },
  };
};

export type CompleteOrderResult =
  | { order: Order; reason?: never }
  | { order?: Order; reason: 'not-active' | 'not-found' };

/** Delivers the order now: the courier is placed at the dropoff and is idle again */
export const completeOrder = (city: City, id: string): CompleteOrderResult => {
  const order = findOrder(city, id);
  if (!order) return { reason: 'not-found' };
  if (!isActive(order)) return { order, reason: 'not-active' };
  deliver(city, order);
  return { order };
};

/** Moves a courier by hand, as a real courier app would report it */
export const moveCourier = (city: City, id: string, point: LatLng) => {
  const courier = findCourier(city, id);
  if (!courier) return undefined;
  courier.lat = point.lat;
  courier.lng = point.lng;
  courier.cell = toCell(point, RES);
  return courier;
};

export const snapshot = ({ at, couriers, orders }: City): CitySnapshot => ({
  at,
  couriers,
  orders,
});
