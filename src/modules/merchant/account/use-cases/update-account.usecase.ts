import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IMerchant } from '@/common/types/access-token.payload';
import { MerchantAccount } from '../entities/account.entity';
import { UpdateMerchantAccountDto } from '../dto/request/account.dto';
import { MerchantAccountResponseDto } from '../dto/response/merchant-account-response.dto';

@Injectable()
export class UpdateMerchantAccountUseCase {
  constructor(
    @InjectRepository(MerchantAccount)
    private readonly accountRepo: Repository<MerchantAccount>,
  ) {}

  async execute(
    merchant: IMerchant,
    dto: UpdateMerchantAccountDto,
  ): Promise<MerchantAccountResponseDto> {
    const account = await this.accountRepo.findOne({
      where: { id: merchant.sub },
      relations: { user: true },
    });

    if (!account) {
      throw new NotFoundException('Merchant account not found');
    }

    Object.assign(account, dto);
    const saved = await this.accountRepo.save(account);
    return MerchantAccountResponseDto.from(saved);
  }
}
