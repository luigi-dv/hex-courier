import { toCell } from '@/lib/h3';

import type { LatLng } from '@/types/LatLng';

const EMPTY: ReadonlySet<string> = new Set();

/**
 * Which ids are in which H3 cell, at one resolution.
 * Lookups are a Map read, so the matcher never does distance maths to find
 * candidates, only to rank them.
 */
export class CellIndex {
  private readonly cellById = new Map<string, string>();
  private readonly idsByCell = new Map<string, Set<string>>();

  constructor(readonly resolution: number) {}

  /** Puts `id` in the cell for `point`, moving it out of its old cell. Returns the cell. */
  upsert(id: string, point: LatLng): string {
    const cell = toCell(point, this.resolution);
    const previous = this.cellById.get(id);
    if (previous === cell) return cell;

    if (previous) this.detach(id, previous);
    let ids = this.idsByCell.get(cell);
    if (!ids) {
      ids = new Set();
      this.idsByCell.set(cell, ids);
    }
    ids.add(id);
    this.cellById.set(id, cell);
    return cell;
  }

  remove(id: string) {
    const cell = this.cellById.get(id);
    if (!cell) return;
    this.detach(id, cell);
    this.cellById.delete(id);
  }

  idsIn(cell: string): ReadonlySet<string> {
    return this.idsByCell.get(cell) ?? EMPTY;
  }

  cellOf(id: string) {
    return this.cellById.get(id);
  }

  /** Number of occupied cells */
  get size() {
    return this.idsByCell.size;
  }

  private detach(id: string, cell: string) {
    const ids = this.idsByCell.get(cell);
    if (!ids) return;
    ids.delete(id);
    // Drop empty sets so the map doesn't grow with every cell a courier passed through
    if (ids.size === 0) this.idsByCell.delete(cell);
  }
}
