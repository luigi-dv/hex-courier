import { describe, expect, it } from 'vitest';

import { CITY_CENTER } from '@/constants/geo';
import {
  COURIER_COUNT,
  MAX_ACTIVE_ORDERS,
  MAX_REPLAY_TICKS,
  TICK_MS,
} from '@/constants/city';

import { distanceMeters } from '@/lib/geo';

import { north } from '@/test/fixtures';

import {
  advanceCity,
  completeOrder,
  createCity,
  moveCourier,
  placeOrder,
} from '.';

const T0 = 1_700_000_000_000;
const dropoff = north(CITY_CENTER, 1500);

/** A city with every courier parked far away except the ones given */
const cityWith = (points: Record<string, { lat: number; lng: number }>) => {
  const city = createCity('test', T0, 42);
  city.couriers.forEach((courier, i) => {
    Object.assign(courier, north(CITY_CENTER, 20_000 + i * 100));
  });
  Object.entries(points).forEach(([id, point]) => {
    Object.assign(
      city.couriers.find((courier) => courier.id === id)!,
      point
    );
  });
  return city;
};

describe('createCity', () => {
  it('starts with idle couriers around the centre', () => {
    const city = createCity('a', T0, 1);

    expect(city.couriers).toHaveLength(COURIER_COUNT);
    expect(city.couriers.every((courier) => courier.status === 'idle')).toBe(
      true
    );
    expect(city.at % TICK_MS).toBe(0);
  });

  it('is the same city for the same seed', () => {
    expect(createCity('a', T0, 7)).toEqual(createCity('a', T0, 7));
  });
});

describe('advanceCity', () => {
  it('replays the same way from the same saved state', () => {
    const saved = JSON.stringify(createCity('a', T0, 3));
    const first = JSON.parse(saved);
    const second = JSON.parse(saved);

    advanceCity(first, T0 + 90_000);
    advanceCity(second, T0 + 30_000);
    advanceCity(second, T0 + 90_000);

    expect(second.couriers).toEqual(first.couriers);
  });

  it('counts only whole ticks and keeps the remainder for next time', () => {
    const city = createCity('a', T0, 3);

    expect(advanceCity(city, T0 + 2500)).toBe(2);
    expect(city.at).toBe(T0 + 2000);
  });

  it('caps a long replay and drops the time it skipped', () => {
    const city = createCity('a', T0, 3);
    const later = T0 + (MAX_REPLAY_TICKS + 500) * TICK_MS;

    expect(advanceCity(city, later)).toBe(MAX_REPLAY_TICKS);
    expect(city.at).toBe(later);
  });

  it('drives an assigned courier to the pickup, then the dropoff, then frees it', () => {
    const city = cityWith({ 'courier-1': north(CITY_CENTER, 100) });
    const { match } = placeOrder(city, {
      dropoff,
      now: T0,
      pickup: CITY_CENTER,
    });
    // 100 m at 18 m per tick: at the pickup within 6 ticks, 1.5 km from the dropoff
    advanceCity(city, T0 + 10_000);
    expect(match!.order.status).toBe('picked_up');

    advanceCity(city, T0 + 200_000);
    const courier = city.couriers.find((c) => c.id === 'courier-1')!;
    expect(city.orders[0].status).toBe('delivered');
    expect(courier.status).toBe('idle');
    expect(courier.orderId).toBeUndefined();
  });
});

describe('placeOrder', () => {
  it('assigns the nearest idle courier and marks it busy', () => {
    const city = cityWith({
      'courier-1': north(CITY_CENTER, -700),
      'courier-2': north(CITY_CENTER, 100),
    });

    const { match } = placeOrder(city, {
      dropoff,
      now: T0,
      pickup: CITY_CENTER,
    });

    expect(match?.order).toMatchObject({
      courierId: 'courier-2',
      status: 'assigned',
    });
    expect(city.couriers.find((c) => c.id === 'courier-2')).toMatchObject({
      orderId: 'order-1',
      status: 'busy',
    });
  });

  it('gives the next order the next courier, then leaves one unassigned', () => {
    const city = cityWith({
      'courier-1': north(CITY_CENTER, -700),
      'courier-2': north(CITY_CENTER, 100),
    });
    const place = () =>
      placeOrder(city, { dropoff, now: T0, pickup: CITY_CENTER }).match!;

    expect(place().order.courierId).toBe('courier-2');
    expect(place().order.courierId).toBe('courier-1');
    const third = place();
    expect(third.order.status).toBe('unassigned');
    expect(third.candidates).toEqual([]);
  });

  it('refuses more than the active order limit', () => {
    const city = createCity('a', T0, 5);
    for (let i = 0; i < MAX_ACTIVE_ORDERS; i++) {
      placeOrder(city, { dropoff, now: T0, pickup: CITY_CENTER });
    }

    expect(
      placeOrder(city, { dropoff, now: T0, pickup: CITY_CENTER }).error
    ).toBe('too-many-active');
  });
});

describe('completeOrder', () => {
  it('frees the courier at the dropoff', () => {
    const city = cityWith({ 'courier-1': north(CITY_CENTER, 100) });
    const { match } = placeOrder(city, {
      dropoff,
      now: T0,
      pickup: CITY_CENTER,
    });

    expect(completeOrder(city, match!.order.id).order?.status).toBe(
      'delivered'
    );
    const courier = city.couriers.find((c) => c.id === 'courier-1')!;
    expect(distanceMeters(courier, dropoff)).toBeLessThan(0.01);
    expect(courier.status).toBe('idle');
  });

  it('refuses an unknown or finished order', () => {
    const city = cityWith({ 'courier-1': north(CITY_CENTER, 100) });
    const { match } = placeOrder(city, {
      dropoff,
      now: T0,
      pickup: CITY_CENTER,
    });
    completeOrder(city, match!.order.id);

    expect(completeOrder(city, match!.order.id).reason).toBe('not-active');
    expect(completeOrder(city, 'order-404').reason).toBe('not-found');
  });
});

describe('moveCourier', () => {
  it('moves a courier and recomputes its cell', () => {
    const city = createCity('a', T0, 5);
    const before = city.couriers[0].cell;

    const courier = moveCourier(city, 'courier-1', north(CITY_CENTER, 5000));

    expect(courier?.cell).not.toBe(before);
    expect(moveCourier(city, 'nobody', CITY_CENTER)).toBeUndefined();
  });
});
