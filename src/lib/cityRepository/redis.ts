import { Redis } from '@upstash/redis';

import { CITY_TTL_S } from '@/constants/city';

import type { City } from '@/types/City';
import type { CityRepository } from './types';

const key = (id: string) => `city:${id}`;

/**
 * Compare-and-set in one round trip. The city is a hash with its version in
 * its own field, so the script never has to parse the JSON.
 * ARGV: expected version ('' = must not exist), new version, json, ttl.
 */
const SAVE_SCRIPT = `
local current = redis.call('HGET', KEYS[1], 'v')
if ARGV[1] == '' then
  if current then return 0 end
elseif current ~= ARGV[1] then
  return 0
end
redis.call('HSET', KEYS[1], 'v', ARGV[2], 'city', ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[4])
return 1
`;

export const createRedisRepository = (
  redis: Redis = Redis.fromEnv({ automaticDeserialization: false })
): CityRepository => ({
  async allow(rateKey, limit, windowS) {
    const bucket = `rate:${rateKey}:${Math.floor(Date.now() / (windowS * 1000))}`;
    const [count] = await redis
      .pipeline()
      .incr(bucket)
      .expire(bucket, windowS)
      .exec<[number, number]>();
    return Number(count) <= limit;
  },

  async load(id) {
    const [json] = await redis
      .pipeline()
      .hget<string>(key(id), 'city')
      .expire(key(id), CITY_TTL_S)
      .exec<[null | string, number]>();
    return json ? (JSON.parse(json) as City) : null;
  },

  async save(city, expectedVersion) {
    const version = (expectedVersion ?? 0) + 1;
    const saved = await redis.eval<string[], number>(
      SAVE_SCRIPT,
      [key(city.id)],
      [
        expectedVersion === null ? '' : String(expectedVersion),
        String(version),
        JSON.stringify({ ...city, version }),
        String(CITY_TTL_S),
      ]
    );
    if (Number(saved) !== 1) return false;
    city.version = version;
    return true;
  },
});
