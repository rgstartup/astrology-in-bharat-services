import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GeneralLedgerEntry,
  GeneralLedgerEntryType,
  GeneralLedgerPartyType,
  GeneralLedgerEventType,
} from '../../infrastructure/entities/general-ledger-entry.entity';

export interface QueryGeneralLedgerDto {
  event_id?: string;
  event_type?: GeneralLedgerEventType;
  entry_type?: GeneralLedgerEntryType;
  party_type?: GeneralLedgerPartyType;
  party_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class GetGeneralLedgerUseCase {
  constructor(
    @InjectRepository(GeneralLedgerEntry)
    private readonly repo: Repository<GeneralLedgerEntry>,
  ) {}

  async execute(filters: QueryGeneralLedgerDto = {}): Promise<{
    data: GeneralLedgerEntry[];
    meta: { total: number; limit: number; offset: number };
  }> {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const qb = this.repo
      .createQueryBuilder('gl')
      .orderBy('gl.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    if (filters.event_id) {
      qb.andWhere('gl.event_id = :event_id', { event_id: filters.event_id });
    }
    if (filters.event_type) {
      qb.andWhere('gl.event_type = :event_type', {
        event_type: filters.event_type,
      });
    }
    if (filters.entry_type) {
      qb.andWhere('gl.entry_type = :entry_type', {
        entry_type: filters.entry_type,
      });
    }
    if (filters.party_type) {
      qb.andWhere('gl.party_type = :party_type', {
        party_type: filters.party_type,
      });
    }
    if (filters.party_id) {
      qb.andWhere('gl.party_id = :party_id', { party_id: filters.party_id });
    }
    if (filters.from_date) {
      qb.andWhere('gl.created_at >= :from', {
        from: new Date(filters.from_date),
      });
    }
    if (filters.to_date) {
      qb.andWhere('gl.created_at <= :to', { to: new Date(filters.to_date) });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, limit, offset } };
  }
}
