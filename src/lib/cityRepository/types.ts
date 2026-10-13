import type { City } from '@/types/City';

export interface CityRepository {
  /** The stored city, or null. Reading also pushes back its expiry. */
  load(id: string): Promise<City | null>;
  /**
   * Saves `city` only if the stored version is still `expectedVersion`
   * (null: only if nothing is stored yet), then bumps `city.version`.
   * Returns false when someone else saved first.
   */
  save(city: City, expectedVersion: null | number): Promise<boolean>;
  /** Fixed-window limit; true when `key` is still under `limit` hits per `windowS` */
  allow(key: string, limit: number, windowS: number): Promise<boolean>;
}
