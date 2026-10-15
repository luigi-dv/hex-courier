'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { RES, RESOLUTIONS } from '@/constants/geo';

import type { Resolution } from '@/lib/city';

interface ResolutionContextValue {
  resolution: Resolution;
  setResolution: (value: Resolution) => void;
}

const ResolutionContext = createContext<ResolutionContextValue | null>(null);

const fromUrl = (): Resolution => {
  const value = Number(new URLSearchParams(window.location.search).get('res'));
  return RESOLUTIONS.includes(value as Resolution)
    ? (value as Resolution)
    : RES;
};

/**
 * The H3 resolution, shared by the live map and the big switch, and kept in
 * the URL (`?res=10`) so a link opens the page the way it was shared.
 */
export const ResolutionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [resolution, setState] = useState<Resolution>(RES);

  useEffect(() => {
    const sync = () => setState(fromUrl());
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const setResolution = useCallback((value: Resolution) => {
    setState(value);
    const url = new URL(window.location.href);
    if (value === RES) url.searchParams.delete('res');
    else url.searchParams.set('res', String(value));
    window.history.replaceState(null, '', url);
  }, []);

  return (
    <ResolutionContext.Provider value={{ resolution, setResolution }}>
      {children}
    </ResolutionContext.Provider>
  );
};

export const useResolution = () => {
  const value = useContext(ResolutionContext);
  if (!value) throw new Error('useResolution needs a ResolutionProvider');
  return value;
};
