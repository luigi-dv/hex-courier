'use client';

import React, { useCallback, useRef, useState } from 'react';

import dynamic from 'next/dynamic';
import { track } from '@vercel/analytics';

import { RequestLog } from '@/components/RequestLog';
import { SearchInspector } from '@/components/SearchInspector';
import { ResolutionSwitch } from '@/components/ResolutionSwitch';

import { REPO_URL } from '@/constants/site';
import { MAX_ACTIVE_ORDERS } from '@/constants/city';

import { useCity } from '@/hooks/useCity';
import { useRingStepper } from '@/hooks/useRingStepper';
import { useSmoothCouriers } from '@/hooks/useSmoothCouriers';
import { sampleOrder, useAutoplay } from '@/hooks/useAutoplay';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

import { ApiError, completeOrder, placeOrder, resetCity } from '@/lib/api';

import { useResolution } from '@/providers/ResolutionProvider';

import type { LatLng } from '@/types/LatLng';
import type { OrderMatch } from '@/types/Match';

// Leaflet touches `window` on import, so the map only renders in the browser
const CourierMap = dynamic(
  () => import('@/components/CourierMap').then((mod) => mod.CourierMap),
  {
    loading: () => (
      <div
        className='h-full w-full bg-surface-2'
        aria-label='Loading the map…'
      />
    ),
    ssr: false,
  }
);

/** Autoplay keeps at most this many of its own orders on the road */
const AUTOPLAY_ON_ROAD = 3;

const errorMessage = (error: unknown) => {
  if (error instanceof ApiError && error.status === 409) {
    return `${MAX_ACTIVE_ORDERS} orders are already on the road. Complete one below or wait for a delivery.`;
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'Too many new cities from your network. Wait a few minutes and reload.';
  }
  return (error as Error).message;
};

const statusLabel: Record<string, string> = {
  assigned: 'driving to the pickup',
  picked_up: 'driving to the dropoff',
};

export const LiveCity = () => {
  const reduceMotion = usePrefersReducedMotion();
  const { resolution, setResolution } = useResolution();
  const { city, error: cityError, refresh } = useCity();
  const couriers = useSmoothCouriers(city?.couriers ?? [], reduceMotion);

  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [match, setMatch] = useState<null | OrderMatch>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [autoplay, setAutoplay] = useState(true);
  const autoplayOrders = useRef<string[]>([]);

  const stepper = useRingStepper(
    match?.order.id ?? null,
    match?.rings.length ?? 0,
    reduceMotion
  );

  const active = (city?.orders ?? []).filter(
    (order) => order.status === 'assigned' || order.status === 'picked_up'
  );
  const idle = (city?.couriers ?? []).filter(
    (courier) => courier.status === 'idle'
  ).length;

  const submit = useCallback(
    async (from: LatLng, to: LatLng) => {
      setPlacing(true);
      setError(null);
      try {
        const result = await placeOrder({
          dropoff: to,
          pickup: from,
          resolution,
        });
        setMatch(result);
        await refresh();
        return result;
      } catch (caught) {
        setError(errorMessage(caught));
        return null;
      } finally {
        setPlacing(false);
      }
    },
    [refresh, resolution]
  );

  const placeSample = useCallback(
    async (from: LatLng, to: LatLng) => {
      // Make room first, so the demo never runs the city out of couriers
      const onRoad = autoplayOrders.current.filter((id) =>
        active.some((order) => order.id === id)
      );
      if (onRoad.length >= AUTOPLAY_ON_ROAD) {
        await completeOrder(onRoad[0]).catch(() => undefined);
        autoplayOrders.current = onRoad.slice(1);
      }
      setPickup(from);
      setDropoff(to);
      const result = await submit(from, to);
      if (result) autoplayOrders.current.push(result.order.id);
    },
    [active, submit]
  );

  useAutoplay({
    once: reduceMotion,
    place: placeSample,
    ready: Boolean(city),
    running: autoplay,
  });

  const takeOver = () => {
    if (!autoplay) return;
    setAutoplay(false);
    track('demo_taken_over');
  };

  // Pickup, then dropoff, then a third click starts a new order
  const onMapClick = (point: LatLng) => {
    takeOver();
    if (!pickup || dropoff) {
      setPickup(point);
      setDropoff(null);
      setMatch(null);
    } else {
      setDropoff(point);
    }
  };

  const onPlace = async () => {
    if (!pickup || !dropoff) return;
    takeOver();
    const result = await submit(pickup, dropoff);
    if (result)
      track('order_placed', { resolution, ring: result.ringUsed ?? -1 });
  };

  const onComplete = async (id: string) => {
    takeOver();
    try {
      await completeOrder(id);
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  // A random order: the keyboard path to everything the map click does
  const onRandom = async () => {
    takeOver();
    const sample = sampleOrder();
    setPickup(sample.pickup);
    setDropoff(sample.dropoff);
    const result = await submit(sample.pickup, sample.dropoff);
    if (result)
      track('order_placed', {
        random: true,
        resolution,
        ring: result.ringUsed ?? -1,
      });
  };

  // Resetting throws away the visitor's orders, so it asks once first
  const [confirmReset, setConfirmReset] = useState(false);
  const onReset = async () => {
    takeOver();
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setConfirmReset(false);
    try {
      await resetCity();
      setMatch(null);
      setPickup(null);
      setDropoff(null);
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const nextStep = !pickup
    ? 'Click the map to set a pickup, or place a random order.'
    : !dropoff
      ? 'Click again to set the dropoff.'
      : 'Ready. Place the order, or click the map to start over.';

  return (
    <section
      id='live'
      aria-labelledby='live-title'
      className='folder relative mx-auto w-[min(80rem,100%-2*var(--margin))] bg-surface pb-16 max-sm:w-full'
      style={{ '--i': 4 } as React.CSSProperties}
    >
      <h2
        id='live-title'
        className='absolute bottom-full left-[38%] flex h-10 items-center bg-surface px-[1.6em] text-body font-medium tracking-normal max-sm:left-[46%] max-sm:h-8 max-sm:text-small'
        style={{ clipPath: 'var(--hex-half)', lineHeight: 1 }}
      >
        Live city
      </h2>

      <div className='flex flex-wrap items-center justify-between gap-4 p-8 max-sm:p-4'>
        <a
          href={REPO_URL}
          className='hex-button'
          onClick={() => track('source_clicked', { where: 'live' })}
        >
          Source on GitHub
        </a>
        <div
          className='flex flex-wrap items-center gap-3 text-small'
          aria-live='polite'
        >
          <span className='text-muted'>
            {autoplay
              ? reduceMotion
                ? 'Showing one sample order.'
                : 'Demo running: a sample order every 12 seconds.'
              : 'Your city: every courier here is yours alone.'}
          </span>
          {autoplay ? (
            <button
              type='button'
              className='hex-button hex-button--quiet min-h-10'
              onClick={takeOver}
            >
              Pause Demo
            </button>
          ) : (
            <button
              type='button'
              className='hex-button hex-button--quiet min-h-10'
              onClick={() => setAutoplay(true)}
            >
              Resume Demo
            </button>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 gap-8 px-8 max-sm:px-4 lg:grid-cols-12'>
        <div
          className='relative h-[68svh] min-h-[26rem] overflow-hidden lg:col-span-8'
          onPointerDown={takeOver}
          data-ui
        >
          <CourierMap
            couriers={couriers}
            resolution={resolution}
            pickup={pickup}
            dropoff={dropoff}
            rings={match?.rings ?? []}
            ringUsed={match?.ringUsed ?? null}
            visibleK={stepper.k}
            chosenId={match?.order.courierId}
            chosenOrder={city?.orders.find(
              (order) => order.id === match?.order.id
            )}
            onMapClick={onMapClick}
            onInteract={takeOver}
          />
        </div>

        <div
          data-ui
          className='min-w-0 space-y-8 lg:col-span-4'
          onPointerDown={takeOver}
        >
          <div className='space-y-4'>
            <p className='tabular text-lead leading-tight'>
              {idle} of {city?.couriers.length ?? 30} couriers free
            </p>
            <p className='text-small text-muted'>{nextStep}</p>
            <ResolutionSwitch
              value={resolution}
              onChange={(value) => {
                takeOver();
                setResolution(value);
                setMatch(null);
                track('resolution_changed', {
                  resolution: value,
                  where: 'live',
                });
              }}
              style={{ fontSize: '0.9375rem' }}
            />
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                className='hex-button'
                onClick={onPlace}
                disabled={!pickup || !dropoff || placing}
              >
                {placing ? 'Matching…' : 'Place Order'}
              </button>
              <button
                type='button'
                className='hex-button hex-button--quiet'
                onClick={onRandom}
                disabled={placing}
              >
                Random Order
              </button>
              <button
                type='button'
                className='hex-button hex-button--quiet'
                onClick={onReset}
                aria-describedby={confirmReset ? 'reset-note' : undefined}
              >
                {confirmReset ? 'Confirm New City' : 'New City'}
              </button>
            </div>
            {confirmReset && (
              <p
                id='reset-note'
                className='text-small text-muted'
                aria-live='polite'
              >
                A new city clears your orders and moves every courier. Press
                again to confirm.
              </p>
            )}
            {(error || cityError) && (
              <p role='alert' className='text-small text-[#ff9b8a]'>
                {error ?? cityError}
              </p>
            )}
          </div>

          {match ? (
            <SearchInspector
              match={match}
              k={stepper.k}
              last={stepper.last}
              onNext={stepper.next}
              onPrev={stepper.prev}
              onReplay={stepper.replay}
            />
          ) : (
            <p className='text-small text-muted'>
              The search shows up here, ring by ring, as soon as an order is
              placed.
            </p>
          )}

          <section aria-labelledby='orders-title' className='space-y-2'>
            <h3
              id='orders-title'
              className='text-body font-medium tracking-[-0.01em]'
            >
              On the road
            </h3>
            {active.length === 0 ? (
              <p className='text-small text-muted'>No orders on the road.</p>
            ) : (
              <ul className='space-y-1.5'>
                {active.map((order) => (
                  <li
                    key={order.id}
                    className='flex items-center gap-3 text-small'
                  >
                    <span className='hex-bullet text-lime' aria-hidden='true' />
                    <span className='min-w-0 flex-1 truncate'>
                      {order.id}: {order.courierId}, {statusLabel[order.status]}
                    </span>
                    <button
                      type='button'
                      className='link shrink-0 text-ink'
                      onClick={() => onComplete(order.id)}
                    >
                      Complete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section
        aria-labelledby='requests-title'
        className='mt-14 space-y-5 px-8 max-sm:px-4'
      >
        <div className='max-w-[60ch]'>
          <h3
            id='requests-title'
            className='text-lead font-medium tracking-[-0.02em]'
          >
            Every request, timed by the server
          </h3>
          <p className='mt-2 text-body'>
            Each response carries a Server-Timing header: loading the city from
            Redis, replaying the seconds since your last request, matching, and
            saving. Point at a request to see where its time went.
          </p>
        </div>
        <div data-ui>
          <RequestLog />
        </div>
      </section>
    </section>
  );
};
