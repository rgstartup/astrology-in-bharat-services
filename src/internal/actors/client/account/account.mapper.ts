import type {
  AddressRow,
  ClientAccountRow,
  MediaRow,
  UserRow,
} from '@/core/drizzledb/schema';

/** `users` columns safe to expose (never `password`). */
export type SafeUserRow = Omit<UserRow, 'password'>;

/**
 * Drizzle-backed shape of a client account with its relations loaded.
 * Includes avatar media, addresses, and wallet balance without user data.
 * Matches the selected profile fields; wallet balance is normalized to a number.
 */
export interface ClientAccountDetails extends Pick<
  ClientAccountRow,
  | 'id'
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'public_id'
  | 'is_blocked'
  | 'date_of_birth'
  | 'time_of_birth'
  | 'place_of_birth'
  | 'marital_status'
  | 'occupation'
  | 'about_me'
  | 'status'
  | 'preferences'
  | 'gender'
  | 'phone'
  | 'phone_verified_at'
  | 'created_at'
  | 'updated_at'
> {
  full_name: ClientAccountRow['name'];
  wallet: { balance: number };
  avatar_media: Pick<MediaRow, 'id' | 'public_id' | 'url'> | null;
  addresses: AddressRow[];
}

/** Convert a numeric-string `total_spending` to a number. */
export function toClientAccountResponse<T extends ClientAccountRow>(
  row: T,
): Omit<T, 'total_spending'> & { total_spending: number } {
  return { ...row, total_spending: Number(row.total_spending) };
}
