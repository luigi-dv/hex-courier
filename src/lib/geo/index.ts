import { greatCircleDistance, UNITS } from 'h3-js';

import type { LatLng } from '@/types/LatLng';

const METERS_PER_DEGREE_LAT = 111_320;

export const distanceMeters = (from: LatLng, to: LatLng) =>
  greatCircleDistance([from.lat, from.lng], [to.lat, to.lng], UNITS.m);

/**
 * Moves `meters` from `from` toward `to`, or lands on `to` if it is closer.
 * Linear in lat/lng, which is fine for the few metres a simulator tick moves.
 */
export const moveTowards = (from: LatLng, to: LatLng, meters: number) => {
  const distance = distanceMeters(from, to);
  if (distance <= meters) return { arrived: true, point: to };
  const fraction = meters / distance;
  return {
    arrived: false,
    point: {
      lat: from.lat + (to.lat - from.lat) * fraction,
      lng: from.lng + (to.lng - from.lng) * fraction,
    },
  };
};

/** A point `meters` away from `origin` in a random direction */
export const randomOffset = (
  origin: LatLng,
  meters: number,
  random: () => number = Math.random
): LatLng => {
  const angle = random() * 2 * Math.PI;
  const dLat = (meters * Math.cos(angle)) / METERS_PER_DEGREE_LAT;
  const dLng =
    (meters * Math.sin(angle)) /
    (METERS_PER_DEGREE_LAT * Math.cos((origin.lat * Math.PI) / 180));
  return { lat: origin.lat + dLat, lng: origin.lng + dLng };
};
