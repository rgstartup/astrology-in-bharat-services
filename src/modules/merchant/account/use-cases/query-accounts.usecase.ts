import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantAccount, MerchantStatus } from '../entities/account.entity';
import { QueryMerchantDto } from '../dto/request/query-merchant.dto';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';
import { MerchantAccountResponseDto } from '../dto/response/merchant-account-response.dto';

@Injectable()
export class QueryMerchantAccountsUseCase {
  constructor(
    @InjectRepository(MerchantAccount)
    private readonly accountRepo: Repository<MerchantAccount>,
  ) {}

  async list(query: QueryMerchantDto) {
    const qb = this.accountRepo
      .createQueryBuilder('merchant')
      .leftJoinAndSelect('merchant.user', 'user')
      .skip(query.offset)
      .take(query.limit);

    if (query?.q) {
      qb.andWhere(
        '(merchant.name ILIKE :q OR merchant.shop_name ILIKE :q OR merchant.city ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }

    if (query?.city) {
      qb.andWhere('merchant.city ILIKE :city', { city: `%${query.city}%` });
    }

    if (query?.status) {
      qb.andWhere('merchant.status = :status', { status: query.status });
    }

    if (query?.is_online === 'true') {
      qb.andWhere('merchant.is_online = true');
    }

    const [data, total] = await qb.getManyAndCount();
    const mapped = data.map((item) => MerchantAccountResponseDto.from(item));
    return new PaginatedResponseDto(mapped, total, query.page, query.limit);
  }

  async byId(id: number): Promise<MerchantAccountResponseDto> {
    const account = await this.accountRepo.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!account) {
      throw new NotFoundException('Merchant account not found');
    }

    return MerchantAccountResponseDto.from(account);
  }

  async findEntityById(id: number): Promise<MerchantAccount | null> {
    return this.accountRepo.findOne({
      where: { id },
      relations: { user: true },
    });
  }

  async byUserId(userId: number): Promise<MerchantAccount | null> {
    return this.accountRepo.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
  }

  async getRaw(): Promise<MerchantAccount[]> {
    return this.accountRepo.find({
      relations: { user: true },
    });
  }
}

