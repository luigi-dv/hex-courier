export type CourierStatus = 'busy' | 'idle';

export interface Courier {
  id: string;
  lat: number;
  lng: number;
  /** H3 cell at the default resolution (`RES`) */
  cell: string;
  status: CourierStatus;
  /** Set while the courier is on a delivery */
  orderId?: string;
}
