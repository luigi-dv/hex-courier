import type { LatLng } from '@/types/LatLng';

/**
 * `unassigned`: nobody idle within `K_MAX` rings of the pickup.
 * `assigned`: a courier is on the way to the pickup.
 * `picked_up`: the courier is on the way to the dropoff.
 */
export type OrderStatus = 'assigned' | 'delivered' | 'picked_up' | 'unassigned';

export interface Order {
  id: string;
  pickup: LatLng;
  dropoff: LatLng;
  status: OrderStatus;
  courierId?: string;
  createdAt: string;
}
