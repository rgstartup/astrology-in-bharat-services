import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';
import { Transaction } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';

interface ResolvedNameRawRow {
  id: string;
  expert_name: string;
  type: string;
}

@Injectable()
export class GetAgentCommissionsUseCase {
  constructor(
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepo: Repository<ProfileAgent>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async execute(userId: string, pagination: PaginationDto) {
    const agentProfile = await this.profileAgentRepo.findOne({
      where: { user_id: userId },
    });
    if (!agentProfile) {
      throw new Error('Agent profile not found');
    }
    const profileId = agentProfile.id;

    const offset = pagination.skip;

    // We join the transactions table with wallets to get transactions for this agent
    const query = this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('finance.wallets', 'w', 'w.id = t.wallet_id')
      .where('w.agent_id = :agentId', { agentId: profileId })
      .andWhere('t.purpose = :purpose', { purpose: 'agent_commission' })
      .orderBy('t.created_at', 'DESC');

    const [transactions, total] = await query
      .skip(offset)
      .take(pagination.limit)
      .getManyAndCount();

    if (transactions.length === 0) {
      return {
        data: [],
        total,
        page: pagination.page,
        limit: pagination.limit,
      };
    }

    // Now we extract IDs for different reference types to resolve names
    const callIds: string[] = [];
    const chatIds: string[] = [];
    const pujaIds: string[] = [];

    transactions.forEach((t) => {
      const refId = t.reference_id || '';
      if (refId.startsWith('call_')) callIds.push(refId.replace('call_', ''));
      else if (refId.startsWith('chat_'))
        chatIds.push(refId.replace('chat_', ''));
      else if (refId.startsWith('puja_'))
        pujaIds.push(refId.replace('puja_', ''));
    });

    // Instead of importing Facades with forwardRef, we use raw SQL to fetch names quickly
    const resolvedNames: Record<string, { expertName: string; type: string }> =
      {};

    if (callIds.length > 0) {
      const calls: ResolvedNameRawRow[] =
        await this.transactionRepo.manager.query(
          `SELECT c.id, u.name as expert_name, c.type 
         FROM consultations.call_sessions c
         LEFT JOIN expert.profile pe ON pe.id = c.expert_id
         LEFT JOIN public.users u ON u.id = pe.user_id
         WHERE c.id = ANY($1)`,
          [callIds],
        );
      calls.forEach(
        (c) =>
          (resolvedNames[`call_${c.id}`] = {
            expertName: c.expert_name,
            type: c.type,
          }),
      );
    }

    if (chatIds.length > 0) {
      const chats: ResolvedNameRawRow[] =
        await this.transactionRepo.manager.query(
          `SELECT c.id, u.name as expert_name, c.type 
         FROM consultations.chat_sessions c
         LEFT JOIN expert.profile pe ON pe.id = c.expert_id
         LEFT JOIN public.users u ON u.id = pe.user_id
         WHERE c.id = ANY($1)`,
          [chatIds],
        );
      chats.forEach(
        (c) =>
          (resolvedNames[`chat_${c.id}`] = {
            expertName: c.expert_name,
            type: c.type,
          }),
      );
    }

    if (pujaIds.length > 0) {
      const pujas: ResolvedNameRawRow[] =
        await this.transactionRepo.manager.query(
          `SELECT p.id, u.name as expert_name, p.puja_type as type 
         FROM puja.appointments p
         LEFT JOIN expert.profile pe ON pe.id = p.astrologer_id
         LEFT JOIN public.users u ON u.id = pe.user_id
         WHERE p.id = ANY($1)`,
          [pujaIds],
        );
      pujas.forEach(
        (p) =>
          (resolvedNames[`puja_${p.id}`] = {
            expertName: p.expert_name,
            type: p.type,
          }),
      );
    }

    const resolvedData = transactions.map((t) => {
      let listing = 'Unknown';
      let type: string = t.purpose || 'commission';
      const refId = t.reference_id || '';

      if (resolvedNames[refId]) {
        listing = resolvedNames[refId].expertName;
        type = resolvedNames[refId].type;
      } else if (refId.startsWith('order_')) {
        type = 'puja_shop';
      }

      return {
        ...t,
        listing,
        type,
        date: t.created_at,
        status:
          (t as { status?: string }).status === 'completed'
            ? 'paid'
            : (t as { status?: string }).status || 'paid',
      };
    });

    return {
      data: resolvedData,
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }
}
