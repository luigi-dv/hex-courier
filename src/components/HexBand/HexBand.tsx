import React from 'react';

/** The pickup cell: middle row, a third of the way along */
const CENTRE = { col: 6, row: 1 };

/** Grid distance on rows where odd rows are shifted right (offset to cube coordinates) */
const hexDistance = (
  a: { col: number; row: number },
  b: { col: number; row: number }
) => {
  const cube = ({ col, row }: { col: number; row: number }) => {
    const x = col - (row - (row & 1)) / 2;
    return { x, y: -x - row, z: row };
  };
  const p = cube(a);
  const q = cube(b);
  return Math.max(
    Math.abs(p.x - q.x),
    Math.abs(p.y - q.y),
    Math.abs(p.z - q.z)
  );
};

/**
 * The mark, built large: a band of hexagons with 4px gaps, the pickup cell in
 * lime and its first ring in white, the rest of the grid in a tone step.
 */
export const HexBand = () => {
  const r = 60;
  const w = Math.sqrt(3) * r;
  const gap = 4;
  const columns = 22;
  const rows = 3;
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * (w + gap) + (row % 2 ? (w + gap) / 2 : 0);
      const y = row * (1.5 * r + gap * 0.87);
      const ring = hexDistance({ col, row }, CENTRE);
      const fill = ring === 0 ? '#dafa9c' : ring === 1 ? '#ffffff' : '#262626';
      const points = [0, 60, 120, 180, 240, 300]
        .map((deg) => {
          const a = (deg * Math.PI) / 180;
          return `${(x + w / 2 + r * Math.sin(a)).toFixed(1)},${(y + r + r * -Math.cos(a)).toFixed(1)}`;
        })
        .join(' ');
      cells.push(<polygon key={`${row}-${col}`} points={points} fill={fill} />);
    }
  }
  const width = columns * (w + gap);
  const height = rows * (1.5 * r + gap) + r / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio='xMinYMid slice'
      className='h-[34svh] w-full max-sm:h-[22svh]'
      aria-hidden='true'
    >
      {cells}
    </svg>
  );
};
