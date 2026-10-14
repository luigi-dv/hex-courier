import { moveCourier } from '@/lib/city';
import { createTimer } from '@/lib/timing';
import { parseLatLng, readJson } from '@/lib/validation';
import { badRequest, cityErrorResponse, json, notFound } from '@/lib/http';

import { updateCity } from '@/services/cityService';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const location = parseLatLng(await readJson(request), 'body');
  if (!location.ok) return badRequest(location.error);

  const timer = createTimer();
  try {
    const { result: courier } = await updateCity(timer, (city) => {
      const moved = moveCourier(city, id, location.value);
      return { result: moved, save: Boolean(moved) };
    });
    if (!courier) return notFound(`Courier ${id} not found`, timer);
    return json({ courier }, timer);
  } catch (error) {
    return cityErrorResponse(error, timer);
  }
}
