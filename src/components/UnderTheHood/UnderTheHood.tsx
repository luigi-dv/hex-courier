import React from 'react';

import Image from 'next/image';

/** One request's path through the system, in order */
const LAYERS = [
  {
    body: 'Validates every coordinate and answers 400, 404, 409 or 429 with what to fix.',
    name: 'Route handler',
  },
  {
    body: 'Saves with compare-and-set and retries, so a poll can never overwrite an order.',
    name: 'City service',
  },
  {
    body: 'Replays the seconds since your last request from a saved seed. Same state in, same city out.',
    name: 'Pure city',
  },
  {
    body: 'Rings of H3 cells and map lookups; distance only to rank. Covered by tests.',
    name: 'Matcher',
  },
  {
    body: 'One hash per visitor, gone after 15 idle minutes. Reads replay, only changes write.',
    name: 'Upstash Redis',
  },
  {
    body: 'Any instance serves any request: nothing lives in a function’s memory.',
    name: 'Vercel Functions',
  },
];

const Layer = ({
  body,
  i,
  name,
}: {
  body: string;
  i: number;
  name: string;
}) => (
  <li
    data-reveal
    style={{ '--i': i } as React.CSSProperties}
    className='flex min-h-[14rem] flex-col justify-between bg-surface p-6 max-sm:min-h-44 max-sm:p-4'
  >
    <h3 className='text-lead tracking-[-0.03em]'>{name}</h3>
    <p className='text-body'>{body}</p>
  </li>
);

const Picture = ({
  alt,
  caption,
  i,
  position = 'object-center',
  src,
}: {
  alt: string;
  src: string;
  caption: string;
  i: number;
  /** Which part of the photo the hexagon keeps */
  position?: string;
}) => (
  <li
    data-reveal
    style={{ '--i': i } as React.CSSProperties}
    className='col-span-2 flex flex-col bg-surface'
  >
    <div className='hex-mask relative mx-auto aspect-[1/1.1547] w-[min(46%,18rem)] overflow-hidden max-sm:w-[70%]'>
      <Image
        src={src}
        alt={alt}
        fill
        sizes='(min-width: 1024px) 22rem, 70vw'
        className={`drift object-cover ${position}`}
      />
    </div>
    <p className='p-6 pt-4 text-body max-sm:p-4'>{caption}</p>
  </li>
);

export const UnderTheHood = () => (
  <section
    id='stack'
    aria-labelledby='stack-title'
    className='bg-surface-2 px-page py-[clamp(5rem,12vw,10rem)]'
  >
    <ol className='grid grid-cols-4 gap-2 max-sm:grid-cols-2 max-sm:gap-1.5'>
      <li className='on-light col-span-2 flex aspect-[3/1] flex-col justify-between bg-lime p-6 text-charcoal max-sm:aspect-auto max-sm:min-h-[120px] max-sm:p-4'>
        <h2 id='stack-title' className='text-head'>
          Under the hood
        </h2>
        <p className='max-w-[44ch] text-body'>
          What happens to one order, in the order it happens. Your city exists
          only for you and only while you use it.
        </p>
      </li>
      <Layer {...LAYERS[0]} i={1} />
      <Layer {...LAYERS[1]} i={2} />
      <Layer {...LAYERS[2]} i={0} />
      <Layer {...LAYERS[3]} i={1} />
      <Picture
        i={2}
        src='/images/warsaw-night.jpg'
        alt='Central Warsaw at night from a plane: lit streets in a grid, the Palace of Culture and Science glowing near the bottom'
        caption='Śródmieście at night, where the couriers ride. The Palace of Culture and Science, lit at the bottom, is the centre of the city in the code.'
      />
      <Picture
        i={0}
        src='/images/warsaw-from-the-palace.jpg'
        position='object-[50%_8%]'
        alt='Rooftops and streets of central Warsaw seen from the Palace of Culture and Science'
        caption='The view from the Palace: a resolution 9 cell is about two of these blocks across.'
      />
      <Layer {...LAYERS[4]} i={1} />
      <Layer {...LAYERS[5]} i={2} />
    </ol>
  </section>
);
