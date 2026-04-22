import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '@/modules/chat/infrastructure/persistence/entities/chat-session.entity';
import { CallSession, CallSessionStatus, CallType } from '@/modules/call/infrastructure/persistence/entities/call-session.entity';
import { Review } from '@/modules/reviews/infrastructure/persistence/entities/review.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { ConsultationHistoryDto, ConsultationType, ConsultationStatus } from '../../api/dto/consultation-history.dto';

@Injectable()
export class GetUnifiedHistoryUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatRepo: Repository<ChatSession>,
    @InjectRepository(CallSession)
    private readonly callRepo: Repository<CallSession>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(ProfileExpert)
    private readonly expertRepo: Repository<ProfileExpert>,
  ) {}

  async execute(userId: number, limit: number = 20, offset: number = 0) {
    // 1. Detect Role: Check if the user is an Expert
    const expertProfile = await this.expertRepo.findOne({
        where: { user: { id: userId } }
    });

    const isExpert = !!expertProfile;
    const filter = isExpert ? { expert_id: expertProfile.id } : { user_id: userId };

    // 2. Fetch Sessions with relations
    const chatSessions = await this.chatRepo.find({
      where: filter,
      relations: ['expert', 'expert.user', 'expert.user.profile_client', 'user', 'user.profile_client'],
      order: { created_at: 'DESC' },
    });

    const callSessions = await this.callRepo.find({
      where: filter,
      relations: ['expert', 'expert.user', 'expert.user.profile_client', 'user', 'user.profile_client'],
      order: { created_at: 'DESC' },
    });

    // 3. Fetch Reviews for these specific sessions
    const chatIds = chatSessions.map(s => s.id);
    const callIds = callSessions.map(s => s.id);

    const whereConditions: any[] = [];
    if (chatIds.length > 0) whereConditions.push({ session_id: In(chatIds) });
    if (callIds.length > 0) whereConditions.push({ call_session_id: In(callIds) });

    const reviews = whereConditions.length > 0 ? await this.reviewRepo.find({
      where: whereConditions
    }) : [];
    
    const chatReviewMap = new Map<number, { rating: number, comment?: string }>();
    const callReviewMap = new Map<number, { rating: number, comment?: string }>();
    
    reviews.forEach(r => {
      if (r.session_id) chatReviewMap.set(r.session_id, { rating: r.rating, comment: r.comment });
      if (r.call_session_id) callReviewMap.set(r.call_session_id, { rating: r.rating, comment: r.comment });
    });

    // 4. Map to Standardized DTO
    const unifiedHistory: ConsultationHistoryDto[] = [
      ...chatSessions.map((s) => {
        const duration = this.calculateDuration(s.start_time, s.end_time);
        return this.mapChatSession(s, chatReviewMap.get(s.id), duration);
      }),
      ...callSessions.map((s) => {
        const duration = s.duration_seconds || 0;
        return this.mapCallSession(s, callReviewMap.get(s.id), duration);
      }),
    ];

    // 5. Sort by startTime / createdAt (DESC)
    unifiedHistory.sort((a, b) => {
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return timeB - timeA;
    });

    // 6. Apply Pagination
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offsetNum = Math.max(0, offset);
    const totalCount = unifiedHistory.length;
    const paginatedData = unifiedHistory.slice(offsetNum, offsetNum + limitNum);

    return {
      data: paginatedData,
      totalCount,
    };
  }

  private mapChatSession(session: ChatSession, review?: { rating: number, comment?: string }, duration: number = 0): ConsultationHistoryDto {
    const total_cost = Number(session.total_cost || 0);
    
    return {
      id: session.id,
      type: ConsultationType.CHAT,
      status: this.mapChatStatus(session.status, duration),
      startTime: session.start_time || session.created_at,
      endTime: session.end_time,
      duration: duration,
      durationString: this.formatDuration(duration),
      terminatedBy: session.terminated_by ?? undefined,
      terminatedReason: 'Normal Closure', 
      total_cost: Math.round(total_cost * 100) / 100,
      platform_fee: Math.round((session.platform_fee || 0) * 100) / 100,
      gst: Math.round((session.gst || 0) * 100) / 100,
      agent_commission: Math.round((session.agent_commission || 0) * 100) / 100,
      expert_earning: Math.round((session.expert_earning || 0) * 100) / 100,
      amount: total_cost,
      rate: Number(session.price_per_minute || 0),
      rating: review?.rating || 0,
      comment: review?.comment,
      expert_image: session.expert?.user?.avatar || session.expert?.user?.profile_client?.profile_picture || (session.expert as any)?.avatar || '/images/dummy-astrologer.jpg',
      user_image: session.user?.profile_client?.profile_picture || session.user?.avatar || '/images/dummy-user.jpg',
      expert_name: session.expert?.user?.name || 'Expert',
      expert_category: session.expert?.specialization || 'Astrologer',
      user_name: session.user?.name || 'Client',
      expert: {
        id: session.expert?.id || 0,
        name: session.expert?.user?.name || 'Expert',
        profileImage: session.expert?.user?.avatar || session.expert?.user?.profile_client?.profile_picture || (session.expert as any)?.avatar || '/images/dummy-astrologer.jpg',
      },
      metadata: {
        terminatedBy: session.terminated_by,
        isFree: session.is_free,
        ...session.metadata,
      },
    };
  }

  private mapCallSession(session: CallSession, review?: { rating: number, comment?: string }, duration: number = 0): ConsultationHistoryDto {
    const final_price = Number(session.final_price || 0);

    return {
      id: session.id,
      type: session.type === CallType.VIDEO ? ConsultationType.VIDEO_CALL : ConsultationType.AUDIO_CALL,
      status: this.mapCallStatus(session.status, duration),
      startTime: session.start_time || session.created_at,
      endTime: session.end_time,
      duration: duration,
      durationString: this.formatDuration(duration),
      terminatedBy: session.terminated_by ?? undefined,
      terminatedReason: session.terminated_reason ?? undefined,
      total_cost: Math.round(final_price * 100) / 100,
      platform_fee: Math.round((session.platform_fee || 0) * 100) / 100,
      gst: Math.round((session.gst || 0) * 100) / 100,
      agent_commission: Math.round((session.agent_commission || 0) * 100) / 100,
      expert_earning: Math.round((session.expert_earning || 0) * 100) / 100,
      amount: final_price,
      rate: Number(session.price_per_minute || 0),
      rating: review?.rating || 0,
      comment: review?.comment,
      expert_image: session.expert?.user?.avatar || session.expert?.user?.profile_client?.profile_picture || (session.expert as any)?.avatar || '/images/dummy-astrologer.jpg',
      user_image: session.user?.profile_client?.profile_picture || session.user?.avatar || '/images/dummy-user.jpg',
      expert_name: session.expert?.user?.name || 'Expert',
      expert_category: session.expert?.specialization || 'Astrologer',
      user_name: session.user?.name || 'Client',
      expert: {
        id: session.expert?.id,
        name: session.expert?.user?.name || 'Expert',
        profileImage: session.expert?.user?.avatar || session.expert?.user?.profile_client?.profile_picture || (session.expert as any)?.avatar || '/images/dummy-astrologer.jpg',
      },
      metadata: {
        callSid: session.twilio_sid,
        isFree: session.is_free,
      },
    };
  }

  private mapChatStatus(status: ChatSessionStatus, duration: number = 0): ConsultationStatus {
    // If status is completed but duration is 0, it was likely missed/ignored
    if (status === ChatSessionStatus.COMPLETED && duration === 0) {
      return ConsultationStatus.MISSED;
    }

    switch (status) {
      case ChatSessionStatus.COMPLETED:
        return ConsultationStatus.COMPLETED;
      case ChatSessionStatus.CANCELLED:
        return ConsultationStatus.CANCELLED;
      case ChatSessionStatus.REJECTED:
        return ConsultationStatus.REJECTED;
      case ChatSessionStatus.EXPIRED:
        return ConsultationStatus.MISSED;
      case ChatSessionStatus.PENDING:
        return ConsultationStatus.PENDING;
      case ChatSessionStatus.ACTIVE:
        return ConsultationStatus.ACTIVE;
      default:
        return ConsultationStatus.COMPLETED;
    }
  }

  private mapCallStatus(status: CallSessionStatus, duration: number = 0): ConsultationStatus {
    // If status is completed but duration is 0, it was likely missed/ignored
    if (status === CallSessionStatus.COMPLETED && duration === 0) {
      return ConsultationStatus.MISSED;
    }

    switch (status) {
      case CallSessionStatus.COMPLETED:
        return ConsultationStatus.COMPLETED;
      case CallSessionStatus.CANCELLED:
        return ConsultationStatus.CANCELLED;
      case CallSessionStatus.REJECTED:
        return ConsultationStatus.REJECTED;
      case CallSessionStatus.EXPIRED:
        return ConsultationStatus.MISSED;
      case CallSessionStatus.PENDING:
        return ConsultationStatus.PENDING;
      case CallSessionStatus.ACTIVE:
        return ConsultationStatus.ACTIVE;
      default:
        return ConsultationStatus.COMPLETED;
    }
  }

  private calculateDuration(start: Date | null, end: Date | null): number {
    if (!start || !end) return 0;
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }
}
