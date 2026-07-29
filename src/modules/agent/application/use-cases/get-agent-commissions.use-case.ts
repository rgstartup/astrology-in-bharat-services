import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { CallFacade } from '@/modules/consultation/call/application/call.facade';
import { PujaAppointmentFacade } from '@/modules/puja-appointment/application/puja-appointment.facade';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';

@Injectable()
export class GetAgentCommissionsUseCase {
  constructor(
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
    @Inject(forwardRef(() => CallFacade))
    private readonly callFacade: CallFacade,
    @Inject(forwardRef(() => PujaAppointmentFacade))
    private readonly pujaFacade: PujaAppointmentFacade,
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

    const callIds: string[] = [];
    const chatIds: string[] = [];
    const pujaIds: string[] = [];

    result.data.forEach((t) => {
      const refId = t.reference_id || '';
      if (refId.startsWith('call_')) callIds.push(refId.replace('call_', ''));
      else if (refId.startsWith('chat_')) chatIds.push(refId.replace('chat_', ''));
      else if (refId.startsWith('puja_')) pujaIds.push(refId.replace('puja_', ''));
    });

    const [callDetails, chatDetails, pujaDetails] = await Promise.all([
      callIds.length > 0 ? this.callFacade.resolveSessionDetails(callIds) : {},
      chatIds.length > 0 ? this.chatFacade.resolveSessionDetails(chatIds) : {},
      pujaIds.length > 0 ? this.pujaFacade.resolveAppointmentDetails(pujaIds) : {},
    ]);

    const resolvedData = result.data.map((t) => {
      let listing = 'Unknown';
      let type: string = t.purpose || 'commission';
      const refId = t.reference_id || '';

      if (refId.startsWith('call_')) {
        const id = refId.replace('call_', '');
        if (callDetails[id]) {
          listing = callDetails[id].expertName;
          type = callDetails[id].type;
        }
      } else if (refId.startsWith('chat_')) {
        const id = refId.replace('chat_', '');
        if (chatDetails[id]) {
          listing = chatDetails[id].expertName;
          type = chatDetails[id].type;
        }
      } else if (refId.startsWith('puja_')) {
        const id = refId.replace('puja_', '');
        if (pujaDetails[id]) {
          listing = pujaDetails[id].expertName;
          type = pujaDetails[id].type;
        }
      } else if (refId.startsWith('order_')) {
        type = 'puja_shop';
      }

      return {
        ...t,
        listing,
        type,
        date: t.created_at,
        status: (t as { status?: string }).status === 'completed'
            ? 'paid'
            : (t as { status?: string }).status || 'paid',
      };
    });

    return {
      data: resolvedData,
      total: result.meta.totalCount,
      page: pagination.page,
      limit: pagination.limit,
    };
  }
}
