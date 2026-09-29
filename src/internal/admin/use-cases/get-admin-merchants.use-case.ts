import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MerchantAccountService } from '@/internal/domains/merchant/account/account.service';
import { GetAdminMerchantsDto } from '../dto/get-merchants.dto';
import { MerchantStatus } from '@/internal/domains/merchant/account/entities/account.entity';

@Injectable()
export class GetAdminMerchantsUseCase {
  constructor(
    @Inject(forwardRef(() => MerchantAccountService))
    private readonly merchantService: MerchantAccountService,
  ) {}

  async execute(dto: GetAdminMerchantsDto) {
    const { search, status, page = 1, limit = 10 } = dto;
    return this.merchantService.listAccounts({
      q: search,
      status: status ? status : undefined,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      skip: ((Number(page) || 1) - 1) * (Number(limit) || 10),
      offset: ((Number(page) || 1) - 1) * (Number(limit) || 10),
    });
  }
}
