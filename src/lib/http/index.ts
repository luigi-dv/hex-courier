import { NextResponse } from 'next/server';

import { CityLimitError } from '@/lib/errors';

import type { Timer } from '@/lib/timing';

/** JSON with the request's `Server-Timing` attached */
export const json = (body: unknown, timer: Timer, init: ResponseInit = {}) => {
  const response = NextResponse.json(body, init);
  response.headers.set('Server-Timing', timer.header());
  response.headers.set('Cache-Control', 'no-store');
  return response;
};

export const errorResponse = (status: number, error: string, timer?: Timer) => {
  const response = NextResponse.json({ error }, { status });
  if (timer) response.headers.set('Server-Timing', timer.header());
  return response;
};

export const badRequest = (error: string) => errorResponse(400, error);

export const notFound = (error: string, timer?: Timer) =>
  errorResponse(404, error, timer);

export const conflict = (error: string, timer?: Timer) =>
  errorResponse(409, error, timer);

/** Turns the errors a city request can throw into responses, rethrowing the rest */
export const cityErrorResponse = (error: unknown, timer: Timer) => {
  if (error instanceof CityLimitError)
    return errorResponse(429, error.message, timer);
  console.error(error);
  return errorResponse(
    503,
    'The city is unavailable right now, try again',
    timer
  );
};
