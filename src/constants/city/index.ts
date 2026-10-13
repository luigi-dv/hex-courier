/** Couriers in a new city */
export const COURIER_COUNT = 30;

/** One simulator step */
export const TICK_MS = 1000;

/** A city nobody has touched for this long is deleted (seconds) */
export const CITY_TTL_S = 15 * 60;

/**
 * Most ticks replayed in one request. A visitor who comes back after longer
 * than the TTL gets a new city anyway, so this only bounds the work.
 */
export const MAX_REPLAY_TICKS = CITY_TTL_S;

/** Reads save the replayed city once it is this many ticks behind, so replays stay short */
export const CHECKPOINT_TICKS = 30;

/** Orders a visitor can have on the road at once */
export const MAX_ACTIVE_ORDERS = 5;

/** Finished orders kept per city, newest first */
export const ORDER_HISTORY = 20;

/** Idle couriers drift up to this far per tick (metres) */
export const WANDER_M = 25;

/** Couriers on a delivery move this far per tick: about 65 km/h, fast so the demo doesn't drag */
export const DELIVERY_SPEED_M = 18;
