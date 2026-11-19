import { Inject, Injectable } from "@nestjs/common";
import type {
  WalletRow,
  WalletKey,
} from "@/core/drizzledb/schema/finance/wallet/wallets.schema";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { wallets } from "@/core/drizzledb/schema/finance/wallet/wallets.schema";
import { eq } from "drizzle-orm";

@Injectable()
export class GetWalletUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    profileId: string | number,
    walletKey: WalletKey,
  ): Promise<WalletRow> {
    const numProfileId =
      typeof profileId === "number" ? profileId : Number(profileId);

    const [existingWallet] = await this.db
      .select()
      .from(wallets)
      .where(eq(wallets[walletKey], numProfileId));

    if (existingWallet) return existingWallet;

    const [newWallet] = await this.db
      .insert(wallets)
      .values({
        [walletKey]: numProfileId,
        balance: "0",
        reserved_balance: "0",
      })
      .returning();

    return newWallet;
  }
}
