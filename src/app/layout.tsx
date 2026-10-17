import React from 'react';

import { Analytics } from '@vercel/analytics/next';

import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
  description:
    'Hex Courier finds the nearest free courier in Warsaw by searching Uber’s H3 hexagons ring by ring. Live map, ring inspector, in-browser benchmark.',
  title: 'Hex Courier: ring by ring',
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0f0f0f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The inline script adds `js` to <html> before React hydrates, on purpose
    <html lang='en' suppressHydrationWarning>
      <head>
        {/* Gates the entrance animations: without JS everything is simply visible */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        <link rel='preconnect' href='https://api.fontshare.com' />
        <link
          rel='preconnect'
          href='https://cdn.fontshare.com'
          crossOrigin=''
        />
        <link
          rel='stylesheet'
          href='https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap'
        />
        <link
          rel='preconnect'
          href='https://tile.openstreetmap.org'
          crossOrigin=''
        />
      </head>
      <body>
        <a
          href='#live'
          className='sr-only z-[2000] bg-lime px-4 py-2 text-charcoal focus:not-sr-only focus:fixed focus:top-4 focus:left-4'
        >
          Skip to the live city
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
