import type { Order } from '@/types/Order';
import type { Courier } from '@/types/Courier';

export interface Candidate {
  courier: Courier;
  /** Straight-line distance to the pickup, not travel time */
  distanceMeters: number;
  /** Ring (grid distance from the pickup cell) the courier was found in */
  ring: number;
}

export interface SearchRing {
  k: number;
  /** Only the cells of this ring, not the whole disk */
  cells: string[];
  /** Idle couriers found in this ring */
  found: number;
}

export interface MatchResult {
  /** Pickup cell */
  origin: string;
  resolution: number;
  /** First ring that gave enough candidates, or the last one searched; null when nobody was found */
  ringUsed: null | number;
  rings: SearchRing[];
  /** Ranked by distance, nearest first */
  candidates: Candidate[];
}

/** What `POST /api/orders` returns */
export interface OrderMatch {
  order: Order;
  origin: string;
  resolution: number;
  ringUsed: null | number;
  rings: SearchRing[];
  candidates: { courierId: string; distanceMeters: number; ring: number }[];
  /** Time spent in the matcher, for the UI and the README */
  durationMs: number;
}
