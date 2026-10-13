import { describe, expect, it } from 'vitest';

import { CITY_TTL_S } from '@/constants/city';

import { createCity } from '@/lib/city';

import { createMemoryRepository } from './memory';

describe('memory city repository', () => {
  it('creates once, then only saves on the expected version', async () => {
    const repository = createMemoryRepository();
    const city = createCity('a', 0, 1);

    expect(await repository.save(city, null)).toBe(true);
    expect(await repository.save(createCity('a', 0, 2), null)).toBe(false);

    const first = (await repository.load('a'))!;
    const second = (await repository.load('a'))!;
    expect(await repository.save(first, first.version)).toBe(true);
    // second was loaded before first saved: it lost the race
    expect(await repository.save(second, second.version)).toBe(false);
  });

  it('hands out copies, never the stored object', async () => {
    const repository = createMemoryRepository();
    await repository.save(createCity('a', 0, 1), null);

    const loaded = (await repository.load('a'))!;
    loaded.couriers = [];

    expect((await repository.load('a'))!.couriers.length).toBeGreaterThan(0);
  });

  it('forgets a city after the TTL', async () => {
    let now = 0;
    const repository = createMemoryRepository(() => now);
    await repository.save(createCity('a', 0, 1), null);

    now = CITY_TTL_S * 1000 + 1;

    expect(await repository.load('a')).toBeNull();
  });

  it('limits hits per window', async () => {
    let now = 0;
    const repository = createMemoryRepository(() => now);

    expect(await repository.allow('ip', 2, 60)).toBe(true);
    expect(await repository.allow('ip', 2, 60)).toBe(true);
    expect(await repository.allow('ip', 2, 60)).toBe(false);
    now = 61_000;
    expect(await repository.allow('ip', 2, 60)).toBe(true);
  });
});
