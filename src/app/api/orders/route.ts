import { RES } from '@/constants/geo';

import { placeOrder } from '@/lib/city';
import { createTimer } from '@/lib/timing';
import { parseLatLng, parseResolution, readJson } from '@/lib/validation';
import { badRequest, cityErrorResponse, conflict, json } from '@/lib/http';

import { readCity, updateCity } from '@/services/cityService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timer = createTimer();
  try {
    const { orders } = await readCity(timer);
    return json({ orders }, timer);
  } catch (error) {
    return cityErrorResponse(error, timer);
  }
}

/** Body: `{ pickup: { lat, lng }, dropoff: { lat, lng }, resolution?: 8 | 9 | 10 }` */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body !== 'object' || body === null) {
    return badRequest('Body must be a JSON object');
  }
  const { dropoff, pickup, resolution } = body as Record<string, unknown>;

  const parsedPickup = parseLatLng(pickup, 'pickup');
  if (!parsedPickup.ok) return badRequest(parsedPickup.error);
  const parsedDropoff = parseLatLng(dropoff, 'dropoff');
  if (!parsedDropoff.ok) return badRequest(parsedDropoff.error);
  const parsedResolution = parseResolution(resolution, RES);
  if (!parsedResolution.ok) return badRequest(parsedResolution.error);

  const timer = createTimer();
  try {
    const { result } = await updateCity(
      timer,
      (city, now) => {
        const placed = placeOrder(city, {
          dropoff: parsedDropoff.value,
          now,
          pickup: parsedPickup.value,
          resolution: parsedResolution.value,
        });
        return { result: placed, save: !placed.error };
      },
      'match'
    );
    if (result.error) {
      return conflict(
        'Too many orders on the road, wait for one to arrive',
        timer
      );
    }
    return json(result.match, timer, { status: 201 });
  } catch (error) {
    return cityErrorResponse(error, timer);
  }
}
