import { cookies, headers } from 'next/headers';

import { CHECKPOINT_TICKS, CITY_TTL_S } from '@/constants/city';

import { CityLimitError } from '@/lib/errors';
import { advanceCity, createCity } from '@/lib/city';
import { getCityRepository } from '@/lib/cityRepository';

import type { City } from '@/types/City';
import type { Timer } from '@/lib/timing';

const COOKIE = 'hc_city';
/** Saves retried after losing a compare-and-set race */
const MAX_ATTEMPTS = 4;
/** New cities per IP per window: enough for a person, not for a script */
const NEW_CITY_LIMIT = { limit: 20, windowS: 10 * 60 };

const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

const clientIp = async () =>
  (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

/** The visitor's city id from the cookie, or a new one (the cookie is set on the response) */
const cityId = async () => {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && /^[\w-]{36}$/.test(existing)) return existing;

  const id = crypto.randomUUID();
  jar.set(COOKIE, id, {
    httpOnly: true,
    maxAge: CITY_TTL_S * 4,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return id;
};

/** Loads the visitor's city, creating it on the first visit or after it expired */
const loadOrCreate = async (id: string, now: number, timer: Timer) => {
  const repository = getCityRepository();
  const stored = await timer.measure('load', () => repository.load(id));
  if (stored)
    return { city: stored, expected: stored.version as null | number };

  const allowed = await repository.allow(
    `new-city:${await clientIp()}`,
    NEW_CITY_LIMIT.limit,
    NEW_CITY_LIMIT.windowS
  );
  if (!allowed)
    throw new CityLimitError('Too many new cities from this address');
  return { city: createCity(id, now, randomSeed()), expected: null };
};

/**
 * The visitor's city, replayed up to now. Reads don't write, except to save a
 * checkpoint when the replay got long; losing that race is fine.
 */
export const readCity = async (timer: Timer): Promise<City> => {
  const id = await cityId();
  const now = Date.now();
  const { city, expected } = await loadOrCreate(id, now, timer);
  const ticks = await timer.measure('replay', () => advanceCity(city, now));

  if (expected === null || ticks >= CHECKPOINT_TICKS) {
    const saved = await timer.measure('save', () =>
      getCityRepository().save(city, expected)
    );
    // Someone else created or advanced it first: theirs is just as current
    if (!saved && expected === null) return readCity(timer);
  }
  return city;
};

/**
 * Replays the city to now, applies `change`, and saves it with compare-and-set.
 * If another request saved in between, it starts over from the fresh city, so
 * a poll can never overwrite an order. `change` must be safe to run again.
 * Return `{ save: false }` from `change` to skip saving (for example on a 404).
 */
export const updateCity = async <T>(
  timer: Timer,
  change: (city: City, now: number) => { result: T; save?: boolean },
  /** Name of the change in Server-Timing */
  label = 'change'
): Promise<{ city: City; result: T }> => {
  const id = await cityId();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const now = Date.now();
    const { city, expected } = await loadOrCreate(id, now, timer);
    await timer.measure('replay', () => advanceCity(city, now));
    const { result, save = true } = await timer.measure(label, () =>
      change(city, now)
    );
    if (!save) return { city, result };

    const saved = await timer.measure('save', () =>
      getCityRepository().save(city, expected)
    );
    if (saved) return { city, result };
  }
  throw new Error('The city kept changing while saving, try again');
};

/** Starts the visitor over with a fresh city under the same cookie */
export const resetCity = async (timer: Timer) => {
  const id = await cityId();
  const repository = getCityRepository();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const stored = await timer.measure('load', () => repository.load(id));
    const city = createCity(id, Date.now(), randomSeed());
    city.version = stored?.version ?? 0;
    if (
      await timer.measure('save', () =>
        repository.save(city, stored?.version ?? null)
      )
    ) {
      return city;
    }
  }
  throw new Error('Could not reset the city, try again');
};
