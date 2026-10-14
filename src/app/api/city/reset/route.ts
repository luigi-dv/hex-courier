import { snapshot } from '@/lib/city';
import { createTimer } from '@/lib/timing';
import { cityErrorResponse, json } from '@/lib/http';

import { resetCity } from '@/services/cityService';

/** A fresh city: new couriers, no orders */
export async function POST() {
  const timer = createTimer();
  try {
    return json(snapshot(await resetCity(timer)), timer);
  } catch (error) {
    return cityErrorResponse(error, timer);
  }
}
