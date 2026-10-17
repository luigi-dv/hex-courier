import { describe, expect, it } from 'vitest';

import { guardScenario, measureRules, searchCost } from '.';

describe('guardScenario', () => {
  it('agrees with and without the guard ring near the centre of the cell', () => {
    const scenario = guardScenario();
    const { withGuard, withoutGuard } = scenario.match(scenario.center);

    expect(withGuard?.courier.id).toBe(withoutGuard?.courier.id);
  });

  it('splits once the pickup is near the edge next to courier A', () => {
    const scenario = guardScenario();
    const pickup = {
      lat:
        scenario.center.lat + (scenario.edge.lat - scenario.center.lat) * 0.95,
      lng:
        scenario.center.lng + (scenario.edge.lng - scenario.center.lng) * 0.95,
    };
    const { inOrigin, withGuard, withoutGuard } = scenario.match(pickup);

    expect(inOrigin).toBe(true);
    expect(withGuard?.courier.id).toBe('A');
    expect(withoutGuard?.courier.id).toBe('B');
  });
});

describe('measureRules', () => {
  it('is reproducible and finds what each rule prevents', () => {
    const first = measureRules({ orders: 300 });

    expect(measureRules({ orders: 300 })).toEqual(first);
    expect(first.busy.wouldGoToBusy).toBeGreaterThan(0);
    expect(first.pentagons.count).toBe(12);
    expect(first.pentagons.error).not.toBe('');
    expect(first.reach.meters).toBeGreaterThan(1000);
  });
});

describe('searchCost', () => {
  it('needs more rings at finer resolutions', () => {
    expect(searchCost(8).rings).toBeLessThan(searchCost(9).rings);
    expect(searchCost(9).rings).toBeLessThan(searchCost(10).rings);
    expect(searchCost(9).cells).toBe(
      3 * searchCost(9).rings * (searchCost(9).rings + 1) + 1
    );
  });
});
