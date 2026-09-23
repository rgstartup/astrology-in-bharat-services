import { EarningEventType } from '../enums';

export interface CalculateEarningsInput {
  eventType: EarningEventType;
  grossAmount: number;
  durationMinutes?: number; // For calls/chats
  providerProfileId?: number | null;
  clientProfileId?: number | null;
  sellerAgentProfileId?: number | null;
  buyerAgentProfileId?: number | null;
  beneficiaryUserId?: number | null;
}

export interface CalculatedEarningsResult {
  grossAmount: number;
  platformEarning: number;
  gstOnPlatformFee: number;
  providerEarning: number;
  sellerAgentEarning: number;
  buyerAgentEarning: number;
  referralEarning: number;
  policyId: number | null;
}
