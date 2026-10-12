import type { MerchantAccountRow } from '@/core/drizzledb/schema';

/**
 * Normalizes Drizzle `merchantAccounts` row.
 * `numeric` columns (`rating`, `latitude`, `longitude`) come back as strings
 * from the driver — normalize to number at the use-case boundary.
 */
export function toMerchantAccountResponse<T extends MerchantAccountRow>(
  row: T,
): Omit<T, 'rating' | 'latitude' | 'longitude'> & {
  rating: number;
  latitude: number | null;
  longitude: number | null;
} {
  return {
    ...row,
    rating: Number(row.rating ?? 0),
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
  };
}
