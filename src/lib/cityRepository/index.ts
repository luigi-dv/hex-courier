import { createRedisRepository } from './redis';
import { createMemoryRepository } from './memory';

import type { CityRepository } from './types';

export { createMemoryRepository } from './memory';
export type { CityRepository } from './types';

const hasRedis = () =>
  Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);

const globalForRepository = globalThis as typeof globalThis & {
  __hexCourierRepository?: CityRepository;
};

/**
 * Redis when it is configured. Without it, development falls back to memory
 * (one process, so that's fine), and production refuses to start: cities in
 * memory would vanish between serverless instances.
 */
export const getCityRepository = (): CityRepository => {
  if (globalForRepository.__hexCourierRepository) {
    return globalForRepository.__hexCourierRepository;
  }
  let repository: CityRepository;
  if (hasRedis()) {
    repository = createRedisRepository();
  } else if (
    process.env.NODE_ENV !== 'production' ||
    process.env.CITY_STORE === 'memory'
  ) {
    console.warn('No Redis configured: cities are kept in memory.');
    repository = createMemoryRepository();
  } else {
    throw new Error(
      'Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_*), or CITY_STORE=memory for a single server.'
    );
  }
  globalForRepository.__hexCourierRepository = repository;
  return repository;
};
