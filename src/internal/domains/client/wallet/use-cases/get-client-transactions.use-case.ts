import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientTransaction } from '../entities/client-transaction.entity';
import { GetClientTransactionsDto } from '../dto/get-client-transactions.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';

@Injectable()
export class GetClientTransactionsUseCase {
  constructor(
    @InjectRepository(ClientTransaction)
    private readonly transactionRepository: Repository<ClientTransaction>,
  ) {}

  async execute(clientId: number, dto: GetClientTransactionsDto) {
    const { limit, page, offset, type, purpose } = dto;

    const query = this.transactionRepository
      .createQueryBuilder('walletTransaction')
      .innerJoin('walletTransaction.wallet', 'wallet')
      .where('wallet.client_id = :clientId', { clientId });

    if (type) {
      query.andWhere('walletTransaction.type = :type', { type });
    }

    if (purpose) {
      query.andWhere('walletTransaction.purpose = :purpose', { purpose });
    }

    const [items, total] = await query
      .orderBy('walletTransaction.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return PaginatedResponseDto.create(items, total, page, limit);
  }
}
