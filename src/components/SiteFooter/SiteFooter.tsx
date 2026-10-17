import React from 'react';

import { HexBand } from '@/components/HexBand';

import { AUTHOR, REPO_URL } from '@/constants/site';

import credits from '@/data/credits.json';

const year = 2026;

export const SiteFooter = () => (
  <footer className='bg-soot pt-[clamp(4rem,10vw,8rem)]'>
    <HexBand />
    <div className='grid gap-10 px-page pt-14 text-small lg:grid-cols-12'>
      <nav
        aria-label='Footer'
        className='grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8'
      >
        <div className='space-y-2'>
          <p className='text-muted'>Project</p>
          <a className='link block' href={REPO_URL}>
            Source
          </a>
          <a className='link block' href={`${REPO_URL}#api`}>
            API
          </a>
          <a className='link block' href={`${REPO_URL}#benchmark`}>
            Benchmark notes
          </a>
        </div>
        <div className='space-y-2'>
          <p className='text-muted'>On this page</p>
          <a className='link block' href='#live'>
            Live city
          </a>
          <a className='link block' href='#search'>
            The search
          </a>
          <a className='link block' href='#benchmark'>
            Benchmark
          </a>
        </div>
        <div className='space-y-2'>
          <p className='text-muted'>Built with</p>
          <a className='link block' href='https://h3geo.org'>
            Uber H3
          </a>
          <a className='link block' href='https://nextjs.org'>
            Next.js
          </a>
          <a className='link block' href='https://upstash.com'>
            Upstash Redis
          </a>
        </div>
        <div className='space-y-2'>
          <p className='text-muted'>Built by</p>
          <a className='link block' href={AUTHOR.url}>
            {AUTHOR.name}
          </a>
        </div>
      </nav>
      <p className='text-muted lg:col-span-4'>
        Pictures:{' '}
        {credits.pictures.map((picture, i) => (
          <React.Fragment key={picture.url}>
            <a className='link text-ink' href={picture.url}>
              “{picture.title}”
            </a>{' '}
            by {picture.creator},{' '}
            <a className='link text-ink' href={picture.licenceUrl}>
              {picture.licence}
            </a>
            , via {picture.source}
            {i < credits.pictures.length - 1 ? '; ' : '. '}
          </React.Fragment>
        ))}
        Map data and tiles © OpenStreetMap contributors.
      </p>
    </div>
    <div className='flex flex-wrap items-center justify-between gap-4 px-page py-10 text-small text-muted'>
      <p>
        © {year} {AUTHOR.name}. MIT licensed.
      </p>
      <a href={REPO_URL} className='hex-button min-h-10'>
        Source on GitHub
      </a>
    </div>
  </footer>
);
