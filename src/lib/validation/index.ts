/**
 * Request body checks for the API routes. Dependency-free: each parser returns
 * the value or an error message, so the route decides the status code.
 */
import { RESOLUTIONS } from '@/constants/geo';

import type { LatLng } from '@/types/LatLng';
import type { Resolution } from '@/lib/city';

type Parsed<T> = { error: string; ok: false } | { ok: true; value: T };

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const parseLatLng = (
  value: unknown,
  field = 'point'
): Parsed<LatLng> => {
  if (typeof value !== 'object' || value === null) {
    return { error: `${field} must be an object with lat and lng`, ok: false };
  }
  const { lat, lng } = value as Record<string, unknown>;
  if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
    return {
      error: `${field}.lat must be a number between -90 and 90`,
      ok: false,
    };
  }
  if (!isFiniteNumber(lng) || lng < -180 || lng > 180) {
    return {
      error: `${field}.lng must be a number between -180 and 180`,
      ok: false,
    };
  }
  return { ok: true, value: { lat, lng } };
};

/** Missing means the default; anything else must be one of `RESOLUTIONS` */
export const parseResolution = (
  value: unknown,
  fallback: Resolution
): Parsed<Resolution> => {
  if (value === undefined || value === null)
    return { ok: true, value: fallback };
  if (!RESOLUTIONS.includes(value as Resolution)) {
    return {
      error: `resolution must be one of ${RESOLUTIONS.join(', ')}`,
      ok: false,
    };
  }
  return { ok: true, value: value as Resolution };
};

/** Parsed JSON body, or null when it isn't valid JSON */
export const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};
