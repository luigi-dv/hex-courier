import { latLngToCell } from 'h3-js';
import { describe, expect, it } from 'vitest';

import { CITY_CENTER, RES } from '@/constants/geo';

import { north } from '@/test/fixtures';

import { CellIndex } from '.';

describe('CellIndex', () => {
  it('moves an id between cells when it changes cell', () => {
    const index = new CellIndex(RES);
    const from = index.upsert('a', CITY_CENTER);
    const to = index.upsert('a', north(CITY_CENTER, 1000));

    expect(to).not.toBe(from);
    expect(index.idsIn(from).has('a')).toBe(false);
    expect(index.idsIn(to).has('a')).toBe(true);
    expect(index.cellOf('a')).toBe(to);
  });

  it('drops a cell once its last id leaves', () => {
    const index = new CellIndex(RES);
    index.upsert('a', CITY_CENTER);
    index.upsert('a', north(CITY_CENTER, 1000));

    expect(index.size).toBe(1);
  });

  it('keeps an id in place when it moves inside the same cell', () => {
    const index = new CellIndex(RES);
    index.upsert('a', CITY_CENTER);
    index.upsert('b', CITY_CENTER);
    const cell = index.upsert('a', north(CITY_CENTER, 1));

    expect(cell).toBe(latLngToCell(CITY_CENTER.lat, CITY_CENTER.lng, RES));
    expect([...index.idsIn(cell)].sort()).toEqual(['a', 'b']);
  });

  it('removes an id', () => {
    const index = new CellIndex(RES);
    const cell = index.upsert('a', CITY_CENTER);
    index.remove('a');

    expect(index.idsIn(cell).size).toBe(0);
    expect(index.cellOf('a')).toBeUndefined();
  });
});
