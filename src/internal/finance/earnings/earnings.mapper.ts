import type { EarningSplitRow } from '@/core/drizzledb/schema';
import type { EarningEventType } from './enum';

export interface EarningSplitDomain {
  id: string;
  reference_id: string;
  reference_type: EarningEventType;
  gross_amount: number;
  platform_earning: number;
  gst_on_platform_fee: number;
  provider_earning: number;
  seller_agent_earning: number;
  buyer_agent_earning: number;
  client_profile_id: number | null;
  provider_profile_id: number | null;
  seller_agent_profile_id: number | null;
  buyer_agent_profile_id: number | null;
  policy_id: number | null;
  created_at: Date;
}

export function toEarningSplitDomain(row: EarningSplitRow): EarningSplitDomain {
  return {
    id: String(row.id),
    reference_id: row.reference_id,
    reference_type: row.reference_type as EarningEventType,
    gross_amount: Number(row.gross_amount) || 0,
    platform_earning: Number(row.platform_earning) || 0,
    gst_on_platform_fee: Number(row.gst_on_platform_fee) || 0,
    provider_earning: Number(row.provider_earning) || 0,
    seller_agent_earning: Number(row.seller_agent_earning) || 0,
    buyer_agent_earning: Number(row.buyer_agent_earning) || 0,
    client_profile_id: row.client_profile_id,
    provider_profile_id: row.provider_profile_id,
    seller_agent_profile_id: row.seller_agent_profile_id,
    buyer_agent_profile_id: row.buyer_agent_profile_id,
    policy_id: row.policy_id,
    created_at: row.created_at,
  };
}
