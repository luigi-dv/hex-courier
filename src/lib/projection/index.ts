import type { LatLng } from '@/types/LatLng';

const METERS_PER_DEGREE = 111_320;

/**
 * Tenths of a metre. Math.cos differs in the last digits between Node and
 * browsers, so unrounded SVG coordinates would break hydration.
 */
const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Flat metres around `center`, for drawing a few hundred metres of city in SVG.
 * y grows downward, like the screen.
 */
export const createProjection = (center: LatLng) => {
  const cos = Math.cos((center.lat * Math.PI) / 180);
  return {
    toLatLng: ({ x, y }: { x: number; y: number }): LatLng => ({
      lat: center.lat - y / METERS_PER_DEGREE,
      lng: center.lng + x / (cos * METERS_PER_DEGREE),
    }),
    toPoint: ({ lat, lng }: LatLng) => ({
      x: round((lng - center.lng) * cos * METERS_PER_DEGREE),
      y: round(-(lat - center.lat) * METERS_PER_DEGREE),
    }),
  };
};

export const polygonPoints = (points: { x: number; y: number }[]) =>
  points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
