import { snapshot } from '@/lib/city';
import { createTimer } from '@/lib/timing';
import { cityErrorResponse, json } from '@/lib/http';

import { readCity } from '@/services/cityService';

export const dynamic = 'force-dynamic';

/** The visitor's city right now: couriers and orders */
export async function GET() {
  const timer = createTimer();
  try {
    return json(snapshot(await readCity(timer)), timer);
  } catch (error) {
    return cityErrorResponse(error, timer);
  }
}
