import { describe, expect, it } from 'vitest';
import {
  cellToBoundary,
  cellToLatLng,
  getPentagons,
  gridDistance,
  latLngToCell,
} from 'h3-js';

import { CITY_CENTER, K_MAX, RES } from '@/constants/geo';

import { courierAt, lookupFor, north } from '@/test/fixtures';

import { findNearbyCouriers, scanNearbyCouriers } from '.';

describe('findNearbyCouriers', () => {
  it('ranks the nearest idle courier first', () => {
    const couriers = [
      courierAt('far', north(CITY_CENTER, 900)),
      courierAt('near', north(CITY_CENTER, 50)),
      courierAt('middle', north(CITY_CENTER, -300)),
    ];

    const result = findNearbyCouriers(CITY_CENTER, lookupFor(couriers));

    expect(result.candidates.map((c) => c.courier.id)).toEqual([
      'near',
      'middle',
      'far',
    ]);
    expect(result.candidates[0].distanceMeters).toBeCloseTo(50, 0);
  });

  it('expands ring by ring until it finds someone, then checks one more ring', () => {
    const courier = courierAt('lonely', north(CITY_CENTER, 1200));
    const expectedRing = gridDistance(
      latLngToCell(CITY_CENTER.lat, CITY_CENTER.lng, RES),
      latLngToCell(courier.lat, courier.lng, RES)
    );

    const result = findNearbyCouriers(CITY_CENTER, lookupFor([courier]), {
      minCandidates: 1,
    });

    expect(expectedRing).toBeGreaterThan(1);
    expect(result.ringUsed).toBe(expectedRing);
    expect(result.rings.map((ring) => ring.k)).toEqual(
      Array.from({ length: expectedRing + 2 }, (_, k) => k)
    );
    expect(result.rings[expectedRing].found).toBe(1);
    // Ring k has 6k cells (1 for the origin)
    expect(result.rings[2].cells).toHaveLength(12);
  });

  it('returns no candidates and ringUsed null when nobody is around', () => {
    const result = findNearbyCouriers(CITY_CENTER, lookupFor([]));

    expect(result.candidates).toEqual([]);
    expect(result.ringUsed).toBeNull();
    expect(result.rings).toHaveLength(K_MAX + 1);
  });

  it('ignores couriers further than kMax rings', () => {
    const result = findNearbyCouriers(
      CITY_CENTER,
      lookupFor([courierAt('too-far', north(CITY_CENTER, 5000))]),
      { kMax: 3 }
    );

    expect(result.candidates).toEqual([]);
  });

  it('skips busy couriers', () => {
    const couriers = [
      courierAt('busy', north(CITY_CENTER, 10), 'busy'),
      courierAt('idle', north(CITY_CENTER, 400)),
    ];

    const result = findNearbyCouriers(CITY_CENTER, lookupFor(couriers), {
      minCandidates: 1,
    });

    expect(result.candidates.map((c) => c.courier.id)).toEqual(['idle']);
  });

  it('finds a courier standing exactly on a cell vertex', () => {
    const origin = latLngToCell(CITY_CENTER.lat, CITY_CENTER.lng, RES);
    const [lat, lng] = cellToBoundary(origin)[0];

    const result = findNearbyCouriers(
      CITY_CENTER,
      lookupFor([courierAt('on-the-line', { lat, lng })]),
      { minCandidates: 1 }
    );

    // Whichever of the three touching cells H3 put it in, it's at most one ring away
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].ring).toBeLessThanOrEqual(1);
  });

  it('prefers a courier just across the border over one at the far side of the pickup cell', () => {
    const origin = latLngToCell(CITY_CENTER.lat, CITY_CENTER.lng, RES);
    const [centerLat, centerLng] = cellToLatLng(origin);
    const boundary = cellToBoundary(origin);
    // Midpoint of one edge, and the opposite edge
    const edge = (i: number) => ({
      lat: (boundary[i][0] + boundary[(i + 1) % 6][0]) / 2,
      lng: (boundary[i][1] + boundary[(i + 1) % 6][1]) / 2,
    });
    const along = (to: { lat: number; lng: number }, t: number) => ({
      lat: centerLat + (to.lat - centerLat) * t,
      lng: centerLng + (to.lng - centerLng) * t,
    });

    const pickup = along(edge(0), 0.95); // inside, near the edge
    const neighbour = courierAt('across-the-border', along(edge(0), 1.05));
    const sameCell = courierAt('far-side-same-cell', along(edge(3), 0.95));
    expect(latLngToCell(neighbour.lat, neighbour.lng, RES)).not.toBe(origin);
    expect(latLngToCell(sameCell.lat, sameCell.lng, RES)).toBe(origin);

    const result = findNearbyCouriers(
      pickup,
      lookupFor([neighbour, sameCell]),
      {
        minCandidates: 1,
      }
    );

    // Ring 0 was already enough, but the extra ring is what catches the closer courier
    expect(result.ringUsed).toBe(0);
    expect(result.candidates[0].courier.id).toBe('across-the-border');
  });

  it('works next to a pentagon', () => {
    // Pentagons break gridRingUnsafe; ringCells falls back to gridDiskDistances.
    // None of them are on land, so this only guards against a crash if someone
    // ever runs the demo in the middle of the ocean.
    const pentagon = getPentagons(RES)[0];
    const [lat, lng] = cellToLatLng(pentagon);
    const pickup = { lat, lng };

    const result = findNearbyCouriers(
      pickup,
      lookupFor([courierAt('sailor', north(pickup, 600))]),
      { minCandidates: 1 }
    );

    expect(result.candidates.map((c) => c.courier.id)).toEqual(['sailor']);
    // A pentagon has 5 neighbours, not 6
    expect(result.rings[1].cells).toHaveLength(5);
  });

  it('needs more rings for the same distance at a finer resolution', () => {
    const courier = courierAt('c', north(CITY_CENTER, 800));
    const ringAt = (resolution: number) =>
      findNearbyCouriers(CITY_CENTER, lookupFor([courier], resolution), {
        // At res 10 (edge about 76 m) 800 m is past K_MAX, which is the trade-off itself
        kMax: 20,
        minCandidates: 1,
        resolution,
      }).ringUsed;

    expect(ringAt(8)).toBeLessThan(ringAt(9)!);
    expect(ringAt(9)).toBeLessThan(ringAt(10)!);
  });

  it('agrees with the full scan on who is nearest', () => {
    const couriers = Array.from({ length: 200 }, (_, i) =>
      courierAt(`c${i}`, {
        lat: CITY_CENTER.lat + Math.sin(i * 12.9898) * 0.02,
        lng: CITY_CENTER.lng + Math.cos(i * 78.233) * 0.03,
      })
    );

    const h3 = findNearbyCouriers(CITY_CENTER, lookupFor(couriers));
    const scan = scanNearbyCouriers(CITY_CENTER, couriers);

    expect(h3.candidates[0].courier.id).toBe(scan[0].courier.id);
  });
});
