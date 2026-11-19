import { Injectable } from "@nestjs/common";
import { WalletKey } from "../entities/wallet.entity";
import { GetWalletUseCase } from "./get-wallet.use-case";

@Injectable()
export class ValidateBalanceUseCase {
  constructor(private readonly getWalletUseCase: GetWalletUseCase) {}

  async execute(
    profileId: number | string,
    walletKey: WalletKey,
    minAmount: number,
  ): Promise<boolean> {
    const wallet = await this.getWalletUseCase.execute(
      Number(profileId),
      walletKey,
    );

    const balance = Number(wallet.balance);
    return balance >= minAmount;
  }
}
