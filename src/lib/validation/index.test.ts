import { describe, expect, it } from 'vitest';

import { parseLatLng, parseResolution } from '.';

describe('parseLatLng', () => {
  it('accepts a valid point', () => {
    expect(parseLatLng({ lat: 52.2, lng: 21 })).toEqual({
      ok: true,
      value: { lat: 52.2, lng: 21 },
    });
  });

  it.each([
    [null, 'must be an object'],
    [{ lat: 91, lng: 0 }, 'lat must be'],
    [{ lat: 0, lng: -181 }, 'lng must be'],
    [{ lat: '52', lng: 21 }, 'lat must be'],
    [{ lat: Number.NaN, lng: 21 }, 'lat must be'],
  ])('rejects %j', (value, message) => {
    const result = parseLatLng(value, 'pickup');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });
});

describe('parseResolution', () => {
  it('falls back to the default when missing', () => {
    expect(parseResolution(undefined, 9)).toEqual({ ok: true, value: 9 });
  });

  it('rejects a resolution the demo does not index', () => {
    expect(parseResolution(7, 9).ok).toBe(false);
  });
});
