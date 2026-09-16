import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IMerchant } from '@/common/types/access-token.payload';
import { MerchantAccount, MerchantStatus } from '../entities/account.entity';
import { MerchantAccountResponseDto } from '../dto/response/merchant-account-response.dto';

@Injectable()
export class UpdateMerchantStatusUseCase {
  constructor(
    @InjectRepository(MerchantAccount)
    private readonly accountRepo: Repository<MerchantAccount>,
  ) {}

  async execute(
    merchant: IMerchant,
    isOnline?: boolean,
  ): Promise<MerchantAccountResponseDto> {
    const account = await this.accountRepo.findOne({
      where: { id: merchant.sub },
    });

    if (!account) {
      throw new NotFoundException('Merchant account not found');
    }

    if (isOnline !== undefined) {
      account.is_online = isOnline;
    }

    const saved = await this.accountRepo.save(account);
    return MerchantAccountResponseDto.from(saved);
  }

  async updateVerification(
    id: number,
    status: MerchantStatus,
    isVerified?: boolean,
  ): Promise<MerchantAccountResponseDto> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Merchant account not found');
    }

    account.status = status;
    if (isVerified !== undefined) {
      account.is_verified = isVerified;
    }

    const saved = await this.accountRepo.save(account);
    return MerchantAccountResponseDto.from(saved);
  }
}
