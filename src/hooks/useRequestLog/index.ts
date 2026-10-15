'use client';

import { useSyncExternalStore } from 'react';

import { requestLog } from '@/lib/requestLog';

export const useRequestLog = () =>
  useSyncExternalStore(
    requestLog.subscribe,
    requestLog.getSnapshot,
    requestLog.getServerSnapshot
  );
