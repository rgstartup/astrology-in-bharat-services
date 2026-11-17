/**
 * Payout accounts service contract.
 *
 * Defines the interface for payout account management (link, unlink, get,
 * validate) plus the DI tokens shared between external contracts and
 * internal implementations.
 */
import type { PayoutProvider } from "../onboarding/payout-provider.interface";
import type { PayoutOnboardingService } from "../onboarding/payout-onboarding.interface";

export interface PayoutAccountsService {
  getPayoutAccount(expertId: string): Promise<PayoutAccount | null>;
  getPayoutAccountById(id: number): Promise<PayoutAccount | null>;
  linkProviderAccount(input: LinkProviderAccountInput): Promise<PayoutAccount>;
  unlinkProviderAccount(expertId: string): Promise<void>;
}

export interface PayoutAccount {
  id: number;
  expertId: string;
  provider: string;
  providerAccountId: string;
  providerAccountData: Record<string, unknown>;
  isActive: boolean;
  validationStatus: "PENDING" | "VALIDATED" | "FAILED";
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkProviderAccountInput {
  expertId: string;
  provider: string;
  providerAccountId: string;
  providerAccountData: Record<string, unknown>;
}

/** DI token for resolving the active payout provider implementation. */
export const PAYOUT_PROVIDER = "IPayoutProvider";

/** DI token for resolving the active payout onboarding service implementation. */
export const PAYOUT_ONBOARDING_SERVICE = "IPayoutOnboardingService";

export interface PayoutProviderModuleOptions {
  provider: PayoutProvider;
  onboardingService: PayoutOnboardingService;
}