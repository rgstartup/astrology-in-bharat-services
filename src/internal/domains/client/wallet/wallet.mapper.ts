import type {
  ClientTransactionRow,
  ClientWalletRow,
} from '@/core/drizzledb/schema';

/**
 * Drizzle `numeric` columns come back as strings from the driver — normalize
 * to number at the use-case boundary (TypeORM did the same conversion via
 * `ColumnNumericTransformer`).
 */
export function toClientWalletResponse<T extends ClientWalletRow>(
  row: T,
): Omit<T, 'balance' | 'reserved_balance'> & {
  balance: number;
  reserved_balance: number;
} {
  return {
    ...row,
    balance: Number(row.balance),
    reserved_balance: Number(row.reserved_balance),
  };
}

export function toClientTransactionResponse<T extends ClientTransactionRow>(
  row: T,
): Omit<T, 'amount' | 'balance_before' | 'balance_after'> & {
  amount: number;
  balance_before: number | null;
  balance_after: number | null;
} {
  return {
    ...row,
    amount: Number(row.amount),
    balance_before:
      row.balance_before == null ? null : Number(row.balance_before),
    balance_after: row.balance_after == null ? null : Number(row.balance_after),
  };
}
