import { CITY_TTL_S } from '@/constants/city';

import type { City } from '@/types/City';
import type { CityRepository } from './types';

interface Entry {
  json: string;
  version: number;
  expiresAt: number;
}

/**
 * For tests and local development without Redis. Stores JSON, not objects,
 * so it behaves like Redis: what you load is a copy, never the saved object.
 */
export const createMemoryRepository = (
  now = () => Date.now()
): CityRepository => {
  const cities = new Map<string, Entry>();
  const hits = new Map<string, { count: number; resetAt: number }>();

  const live = (id: string) => {
    const entry = cities.get(id);
    if (entry && entry.expiresAt <= now()) {
      cities.delete(id);
      return undefined;
    }
    return entry;
  };

  return {
    async allow(key, limit, windowS) {
      const current = hits.get(key);
      if (!current || current.resetAt <= now()) {
        hits.set(key, { count: 1, resetAt: now() + windowS * 1000 });
        return true;
      }
      current.count++;
      return current.count <= limit;
    },

    async load(id) {
      const entry = live(id);
      if (!entry) return null;
      entry.expiresAt = now() + CITY_TTL_S * 1000;
      return JSON.parse(entry.json) as City;
    },

    async save(city, expectedVersion) {
      const entry = live(city.id);
      if ((entry?.version ?? null) !== expectedVersion) return false;
      const version = (expectedVersion ?? 0) + 1;
      city.version = version;
      cities.set(city.id, {
        expiresAt: now() + CITY_TTL_S * 1000,
        json: JSON.stringify(city),
        version,
      });
      return true;
    },
  };
};
