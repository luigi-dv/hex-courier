import type { LatLng } from '@/types/LatLng';

/** H3 resolutions the demo supports, from sparse (8) to dense (10) */
export const RESOLUTIONS = [8, 9, 10] as const;

/** Default resolution: average cell edge about 200 m, a few city blocks */
export const RES = 9;

/** Furthest ring the matcher searches before giving up */
export const K_MAX = 5;

/** How many idle couriers the matcher wants before it stops expanding */
export const MIN_CANDIDATES = 3;

/** Warsaw, Palace of Culture and Science */
export const CITY_CENTER: LatLng = { lat: 52.2318, lng: 21.0067 };

/** Idle couriers wander inside this radius around the city centre (metres) */
export const CITY_RADIUS_M = 3000;
