import { createTimer } from '@/lib/timing';
import { cityErrorResponse, json } from '@/lib/http';

import { readCity } from '@/services/cityService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timer = createTimer();
  try {
    const { couriers } = await readCity(timer);
    return json({ couriers }, timer);
  } catch (error) {
    return cityErrorResponse(error, timer);
  }
}
