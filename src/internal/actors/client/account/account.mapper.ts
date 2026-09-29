import type {
  AddressRow,
  ClientAccountRow,
  MediaRow,
  UserRow,
} from '../../../../core/drizzledb/schema';

/** `users` columns safe to expose (never `password`). */
export type SafeUserRow = Omit<UserRow, 'password'>;

/**
 * Drizzle-backed shape of a client account with its relations loaded.
 * Mirrors what the legacy TypeORM `getAccount` returned with
 * `relations: ['user', 'avatar_media', 'addresses']`, except
 * `total_spending` is normalized to a number (Drizzle returns numeric
 * as string; TypeORM did the same conversion via ColumnNumericTransformer).
 */
export interface ClientAccountDetails extends Omit<
  ClientAccountRow,
  'total_spending'
> {
  total_spending: number;
  user: SafeUserRow | null;
  avatar_media: MediaRow | null;
  addresses: AddressRow[];
}

/** Convert a numeric-string `total_spending` to a number. */
export function toClientAccountResponse<T extends ClientAccountRow>(
  row: T,
): Omit<T, 'total_spending'> & { total_spending: number } {
  return { ...row, total_spending: Number(row.total_spending) };
}
