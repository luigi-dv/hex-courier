/**
 * Every API call the page makes, for the request log. A tiny external store
 * (subscribe + getSnapshot) so React reads it with useSyncExternalStore.
 * Repeated polls collapse into one row with a count, or they'd bury the
 * requests worth looking at.
 */
export interface TimingEntry {
  name: string;
  ms: number;
}

export interface LoggedRequest {
  id: number;
  method: string;
  path: string;
  status: number;
  /** Round trip measured in the browser */
  ms: number;
  /** From the response's Server-Timing header */
  timings: TimingEntry[];
  /** Short excerpt of the response body */
  body: string;
  at: number;
  /** Polls folded into this row */
  count: number;
}

const MAX_ROWS = 12;

/** One shared empty list: useSyncExternalStore needs the same reference every call */
const NO_ROWS: LoggedRequest[] = [];

let rows: LoggedRequest[] = NO_ROWS;
let nextId = 1;
const listeners = new Set<() => void>();

export const parseServerTiming = (header: null | string): TimingEntry[] =>
  (header ?? '')
    .split(',')
    .map((part) => {
      const [name, ...params] = part.trim().split(';');
      const dur = params.find((param) => param.trim().startsWith('dur='));
      return { ms: Number(dur?.split('=')[1] ?? 0), name: name.trim() };
    })
    .filter((entry) => entry.name);

export const logRequest = (
  entry: Omit<LoggedRequest, 'at' | 'count' | 'id'>
) => {
  const latest = rows[0];
  if (
    latest &&
    entry.method === 'GET' &&
    latest.method === 'GET' &&
    latest.path === entry.path &&
    latest.status === entry.status
  ) {
    rows = [
      { ...latest, ...entry, at: Date.now(), count: latest.count + 1 },
      ...rows.slice(1),
    ];
  } else {
    rows = [
      { ...entry, at: Date.now(), count: 1, id: nextId++ },
      ...rows,
    ].slice(0, MAX_ROWS);
  }
  listeners.forEach((listener) => listener());
};

export const requestLog = {
  getServerSnapshot: () => NO_ROWS,
  getSnapshot: () => rows,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
