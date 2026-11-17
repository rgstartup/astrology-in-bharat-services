import { Injectable } from "@nestjs/common";
import {
  InitiatePayoutOnboardingUseCase,
  CompletePayoutOnboardingUseCase,
  ExecutePayoutUseCase,
  ReconcilePayoutsUseCase,
  ListPayoutLinksUseCase,
  RemovePayoutAccountUseCase,
  SetPrimaryPayoutAccountUseCase,
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
import type { PayoutLinkItem } from "./use-cases/list-payout-links.usecase";
import type {
  RemovePayoutAccountInput,
  RemovePayoutAccountOutput,
} from "./use-cases/remove-payout-account.usecase";
import type {
  SetPrimaryPayoutAccountInput,
  SetPrimaryPayoutAccountOutput,
} from "./use-cases/set-primary-payout-account.usecase";

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
    private readonly listLinksUseCase: ListPayoutLinksUseCase,
    private readonly removePayoutAccountUseCase: RemovePayoutAccountUseCase,
    private readonly setPrimaryPayoutAccountUseCase: SetPrimaryPayoutAccountUseCase,
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

  listLinks(input: { expertId: number }): Promise<PayoutLinkItem[]> {
    return this.listLinksUseCase.execute(input).then((result) => result.links);
  }

  removePayoutAccount(
    input: RemovePayoutAccountInput,
  ): Promise<RemovePayoutAccountOutput> {
    return this.removePayoutAccountUseCase.execute(input);
  }

  setPrimaryPayoutAccount(
    input: SetPrimaryPayoutAccountInput,
  ): Promise<SetPrimaryPayoutAccountOutput> {
    return this.setPrimaryPayoutAccountUseCase.execute(input);
  }
}
