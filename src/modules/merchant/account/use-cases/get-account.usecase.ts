import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IMerchant } from '@/common/types/access-token.payload';
import { MerchantAccount } from '../entities/account.entity';
import { MerchantAccountResponseDto } from '../dto/response/merchant-account-response.dto';

@Injectable()
export class GetMerchantAccountUseCase {
  constructor(
    @InjectRepository(MerchantAccount)
    private readonly accountRepo: Repository<MerchantAccount>,
  ) {}

  async execute(merchant: IMerchant): Promise<MerchantAccountResponseDto> {
    const account = await this.accountRepo.findOne({
      where: { id: merchant.sub },
      relations: { user: true },
    });

    if (!account) {
      throw new NotFoundException('Merchant account not found');
    }

    return MerchantAccountResponseDto.from(account);
  }
}
