import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import { clientWallets } from '../../../../../core/drizzledb/schema';
import { ClientWallet } from '../entities/client-wallet.entity';
import { toClientWalletResponse } from '../wallet.mapper';

@Injectable()
export class GetClientWalletUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number): Promise<ClientWallet> {
    const [existingWallet] = await this.db
      .select()
      .from(clientWallets)
      .where(eq(clientWallets.client_id, Number(clientId)))
      .limit(1);

    if (existingWallet) {
      return toClientWalletResponse(existingWallet) as ClientWallet;
    }

    const [newWallet] = await this.db
      .insert(clientWallets)
      .values({
        client_id: Number(clientId),
        balance: '0',
        reserved_balance: '0',
      })
      .returning();

    return toClientWalletResponse(newWallet) as ClientWallet;
  }
}
