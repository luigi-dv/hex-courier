'use client';

import React, { useState } from 'react';

import { useRequestLog } from '@/hooks/useRequestLog';

import type { LoggedRequest } from '@/lib/requestLog';

const ms = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const clock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** What a request spent its time on: the server's own timings, then the network */
const Preview = ({ request }: { request: LoggedRequest }) => {
  const server = request.timings.reduce((sum, timing) => sum + timing.ms, 0);
  const parts = [
    ...request.timings,
    { ms: Math.max(request.ms - server, 0), name: 'network' },
  ];
  const total = Math.max(request.ms, 0.001);

  return (
    <div className='space-y-4'>
      <p className='tabular text-small text-muted'>
        {request.method} {request.path}, {request.status},{' '}
        {ms.format(request.ms)} ms at {clock.format(request.at)}
        {request.count > 1 ? `, polled ${request.count} times` : ''}
      </p>
      <ul className='space-y-1.5' aria-label='Where the time went'>
        {parts.map((part) => (
          <li
            key={part.name}
            className='tabular grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3 text-small'
          >
            <span>{part.name}</span>
            <span className='h-2 bg-surface-2'>
              <span
                className={`block h-full ${part.name === 'network' ? 'bg-muted' : 'bg-lime'}`}
                style={{ width: `${Math.max((part.ms / total) * 100, 1)}%` }}
              />
            </span>
            <span className='text-right'>{ms.format(part.ms)} ms</span>
          </li>
        ))}
      </ul>
      <pre className='max-h-48 overflow-auto whitespace-pre-wrap break-all bg-soot p-3 text-small leading-relaxed text-muted'>
        <code>{request.body || '(empty body)'}</code>
      </pre>
    </div>
  );
};

/**
 * Every call the page makes to the API. Pointing at a row brings its timing
 * breakdown and response into the frame and dims the rest; on touch screens
 * the breakdown opens under the row instead.
 */
export const RequestLog = () => {
  const rows = useRequestLog();
  const [activeId, setActiveId] = useState<null | number>(null);
  const active = rows.find((row) => row.id === activeId) ?? rows[0];

  if (rows.length === 0) {
    return (
      <p className='text-small text-muted'>
        Requests appear here as the page talks to the API.
      </p>
    );
  }

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'>
      <ul
        aria-label='Requests'
        className='group/rows space-y-1'
        onMouseLeave={() => setActiveId(null)}
      >
        {rows.map((row) => {
          const isActive = row.id === active?.id;
          return (
            <li key={row.id}>
              <button
                type='button'
                aria-expanded={isActive}
                onMouseEnter={() => setActiveId(row.id)}
                onFocus={() => setActiveId(row.id)}
                onClick={() => setActiveId(row.id)}
                className={`tabular grid w-full grid-cols-[3.5rem_minmax(0,1fr)_2.5rem_4.5rem] items-center gap-3 px-2 py-1.5 text-left text-small transition-opacity duration-[240ms] ${
                  isActive
                    ? 'bg-surface-2 opacity-100'
                    : 'opacity-100 group-hover/rows:opacity-45'
                }`}
              >
                <span
                  className={row.method === 'GET' ? 'text-muted' : 'text-lime'}
                >
                  {row.method}
                </span>
                <span className='truncate'>
                  {row.path}
                  {row.count > 1 ? ` ×${row.count}` : ''}
                </span>
                <span
                  className={row.status >= 400 ? 'text-[#ff9b8a]' : 'text-ink'}
                >
                  {row.status}
                </span>
                <span className='text-right'>{ms.format(row.ms)} ms</span>
              </button>
              {isActive && (
                <div className='px-2 pb-4 pt-3 lg:hidden'>
                  <Preview request={row} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className='hidden lg:block' aria-live='polite'>
        {active && (
          <div key={active.id} className='crossfade'>
            <Preview request={active} />
          </div>
        )}
      </div>
    </div>
  );
};
