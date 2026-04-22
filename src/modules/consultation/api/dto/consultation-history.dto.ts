
export enum ConsultationType {
  CHAT = 'CHAT',
  AUDIO_CALL = 'AUDIO_CALL',
  VIDEO_CALL = 'VIDEO_CALL',
}

export enum ConsultationStatus {
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export class ConsultationExpertDto {
  id: number;
  name: string;
  profileImage: string;
}

export class ConsultationHistoryDto {
  id: string | number;
  type: ConsultationType;
  status: ConsultationStatus;
  startTime: Date | null;
  endTime: Date | null;
  duration: number; // in seconds
  amount: number;
  rate: number; // price per minute
  rating: number; // session rating
  expert_image: string;
  user_image: string;
  expert_name: string;
  expert_category: string;
  user_name: string;
  durationString: string;
  comment?: string;
  terminatedBy?: string;
  terminatedReason?: string;
  total_cost: number;
  platform_fee: number;
  gst: number;
  agent_commission: number;
  expert_earning: number;
  expert: ConsultationExpertDto;
  metadata?: any;
}

export class UnifiedHistoryResponseDto {
  success: boolean;
  data: ConsultationHistoryDto[];
  meta: {
    totalCount: number;
    limit: number;
    offset: number;
  };
}
