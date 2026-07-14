import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { CallSession } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { ChatSession } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { PujaAppointment } from '@/modules/puja-appointment/infrastructure/entities/puja-appointment.entity';
import { PaginationDto } from '@/common/dto/pagination.dto';

import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';

@Injectable()
export class GetAgentCommissionsUseCase {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    @InjectRepository(CallSession)
    private readonly callSessionRepo: Repository<CallSession>,
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
    @InjectRepository(PujaAppointment)
    private readonly pujaAppointmentRepo: Repository<PujaAppointment>,
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepo: Repository<ProfileAgent>,
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
    const result = await this.walletFacade.getTransactions(
      profileId,
      'agent_id',
      String(pagination.limit),
      String(offset),
      'all',
      'agent_commission',
    );

    const resolvedData = await Promise.all(
      result.data.map(async (t) => {
        let listing = 'Unknown';
        let type: string = t.purpose || 'commission';
        const refId = t.reference_id || '';

        try {
          if (refId.startsWith('call_')) {
            const callId = String(refId.replace('call_', ''));
            const call = await this.callSessionRepo.findOne({
              where: { id: callId },
              relations: ['expert', 'expert.user'],
            });
            if (call) {
              listing = call.expert?.user?.name || 'Expert';
              type =
                (call.type as string) === 'video' ? 'video_call' : 'audio_call';
            }
          } else if (refId.startsWith('chat_')) {
            const chatId = String(refId.replace('chat_', ''));
            const chat = await this.chatSessionRepo.findOne({
              where: { id: chatId },
              relations: ['expert', 'expert.user'],
            });
            if (chat) {
              listing = chat.expert?.user?.name || 'Expert';
              type = 'chat';
            }
          } else if (refId.startsWith('puja_')) {
            const pujaId = String(refId.replace('puja_', ''));
            const puja = await this.pujaAppointmentRepo.findOne({
              where: { id: pujaId },
              relations: ['expert', 'expert.user', 'puja'],
            });
            if (puja) {
              listing = puja.expert?.user?.name || 'Expert';
              type = 'puja_service';
            }
          } else if (refId.startsWith('order_')) {
            type = 'puja_shop';
          }
        } catch (err) {
          console.error('Error resolving commission detail:', err);
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
      }),
    );

    return {
      data: resolvedData,
      total: result.meta.totalCount,
      page: pagination.page,
      limit: pagination.limit,
    };
  }
}
