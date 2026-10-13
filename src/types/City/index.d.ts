import type { Order } from '@/types/Order';
import type { Courier } from '@/types/Courier';

/**
 * One visitor's city. Plain data so it can be stored as JSON: the matcher's
 * cell indexes are rebuilt from it on each request.
 */
export interface City {
  id: string;
  /** Bumped on every save, for compare-and-set */
  version: number;
  /** Simulated clock in ms since epoch, always a whole number of ticks */
  at: number;
  /** Random generator state, so replaying the same ticks gives the same city */
  seed: number;
  couriers: Courier[];
  orders: Order[];
  nextOrderNumber: number;
}

/** What the browser gets: the city without its internals */
export interface CitySnapshot {
  at: number;
  couriers: Courier[];
  orders: Order[];
}
