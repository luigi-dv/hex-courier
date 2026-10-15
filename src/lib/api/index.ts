/** Browser-side calls to the API. Every call lands in the request log. */
import { logRequest, parseServerTiming } from '@/lib/requestLog';

import type { Order } from '@/types/Order';
import type { Resolution } from '@/lib/city';
import type { LatLng } from '@/types/LatLng';
import type { OrderMatch } from '@/types/Match';
import type { CitySnapshot } from '@/types/City';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const excerpt = (text: string) =>
  text.length > 600 ? `${text.slice(0, 600)}…` : text;

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const method = init.method ?? 'GET';
  const start = performance.now();
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
  const text = await response.text();
  logRequest({
    body: excerpt(text),
    method,
    ms: performance.now() - start,
    path,
    status: response.status,
    timings: parseServerTiming(response.headers.get('Server-Timing')),
  });

  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new ApiError(
      body.error ?? `Request failed with ${response.status}`,
      response.status
    );
  }
  return body as T;
};

export const fetchCity = (signal?: AbortSignal) =>
  request<CitySnapshot>('/api/city', { signal });

export const resetCity = () =>
  request<CitySnapshot>('/api/city/reset', { method: 'POST' });

export const placeOrder = (body: {
  pickup: LatLng;
  dropoff: LatLng;
  resolution: Resolution;
}) =>
  request<OrderMatch>('/api/orders', {
    body: JSON.stringify(body),
    method: 'POST',
  });

export const completeOrder = (id: string) =>
  request<{ order: Order }>(`/api/orders/${id}/complete`, { method: 'POST' });
