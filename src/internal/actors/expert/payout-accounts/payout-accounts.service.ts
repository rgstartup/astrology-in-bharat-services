import { Injectable } from "@nestjs/common";
import {
  InitiatePayoutOnboardingUseCase,
  CompletePayoutOnboardingUseCase,
  ExecutePayoutUseCase,
  ReconcilePayoutsUseCase,
} from "./use-cases";
import type {
  InitiatePayoutOnboardingInput,
  InitiatePayoutOnboardingOutput,
} from "./use-cases/initiate-payout-accounts.usecase";
import type {
  CompletePayoutOnboardingInput,
  CompletePayoutOnboardingOutput,
} from "./use-cases/complete-payout-accounts.usecase";
import type { ExecutePayoutInput, ExecutePayoutOutput } from "./use-cases/execute-payout.usecase";
import type { ReconcilePayoutsInput, ReconcilePayoutsOutput } from "./use-cases/reconcile-payouts.usecase";

/**
 * Payout accounts entry point for experts.
 *
 * Responsibilities:
 * - Delegate initiate/complete/execute/reconcile flows
 *   to their single-responsibility use-cases.
 */
@Injectable()
export class PayoutAccountsService {
  constructor(
    private readonly initiateUseCase: InitiatePayoutOnboardingUseCase,
    private readonly completeUseCase: CompletePayoutOnboardingUseCase,
    private readonly executePayoutUseCase: ExecutePayoutUseCase,
    private readonly reconcileUseCase: ReconcilePayoutsUseCase,
  ) {}

  initiateOnboarding(
    input: InitiatePayoutOnboardingInput,
  ): Promise<InitiatePayoutOnboardingOutput> {
    return this.initiateUseCase.execute(input);
  }

  completeOnboarding(
    input: CompletePayoutOnboardingInput,
  ): Promise<CompletePayoutOnboardingOutput> {
    return this.completeUseCase.execute(input);
  }

  executePayout(input: ExecutePayoutInput): Promise<ExecutePayoutOutput> {
    return this.executePayoutUseCase.execute(input);
  }

  reconcilePayouts(input?: ReconcilePayoutsInput): Promise<ReconcilePayoutsOutput> {
    return this.reconcileUseCase.execute(input ?? {});
  }
}
