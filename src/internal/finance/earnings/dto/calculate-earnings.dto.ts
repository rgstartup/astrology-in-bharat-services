import { EarningEventType } from '../enum';

export interface CalculateEarningsInput {
  eventType: EarningEventType;
  grossAmount: number;
  durationMinutes?: number; // For calls/chats
  providerProfileId?: number | null;
  clientProfileId?: number | null;
  sellerAgentProfileId?: number | null;
  buyerAgentProfileId?: number | null;
}

export interface CalculatedEarningsResult {
  grossAmount: number;
  platformEarning: number;
  gstOnPlatformFee: number;
  providerEarning: number;
  sellerAgentEarning: number;
  buyerAgentEarning: number;
  policyId: number | null;
}
