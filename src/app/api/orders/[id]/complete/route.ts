import { completeOrder } from '@/lib/city';
import { createTimer } from '@/lib/timing';
import { cityErrorResponse, conflict, json, notFound } from '@/lib/http';

import { updateCity } from '@/services/cityService';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Context) {
  const { id } = await params;
  const timer = createTimer();
  try {
    const { result } = await updateCity(timer, (city) => {
      const completed = completeOrder(city, id);
      return { result: completed, save: !completed.reason };
    });
    if (result.reason === 'not-found')
      return notFound(`Order ${id} not found`, timer);
    if (result.reason === 'not-active') {
      return conflict(
        `Order ${id} is ${result.order?.status}, nothing to complete`,
        timer
      );
    }
    return json({ order: result.order }, timer);
  } catch (error) {
    return cityErrorResponse(error, timer);
  }
}
