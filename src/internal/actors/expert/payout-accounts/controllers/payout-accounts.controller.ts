import {
  Delete,
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  ParseIntPipe,
  Param,
} from "@nestjs/common";
import { ExpertJwtAuthGuard } from "@/internal/actors/expert/auth/guards/auth.guard";
import { CurrentExpert } from "@/internal/actors/expert/auth/decorators/current-expert.decorator";
import { type IExpert } from "@/shared/types/access-token.payload";
import { PayoutAccountsService } from "../payout-accounts.service";
import {
  InitiatePayoutOnboardingDto,
  CompletePayoutOnboardingDto,
  ExecutePayoutDto,
  ReconcilePayoutsDto,
} from "../dto";

@Controller({
  path: "expert/payout-accounts",
  version: "1",
})
export class PayoutAccountsController {
  constructor(private readonly payoutAccountsService: PayoutAccountsService) {}

  /** Initiate payout onboarding for an expert.
   * RazorpayX: returns a form spec (account_holder_name, account_number, ifsc)
   * for the frontend to render bank details input.
   */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("initiate")
  async initiate(
    @CurrentExpert() expert: IExpert,
    @Body() dto: InitiatePayoutOnboardingDto,
  ) {
    return this.payoutAccountsService.initiateOnboarding({
      expertId: expert.sub,
      providerCode: dto.providerCode ?? "razorpayx",
      redirectUri: dto.redirectUri,
    });
  }

  /** Complete payout onboarding.
   * RazorpayX: creates contact + fund account from bank details submitted
   * via the form returned by initiate.
   */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("complete")
  async complete(
    @CurrentExpert() expert: IExpert,
    @Body() dto: CompletePayoutOnboardingDto,
  ) {
    return this.payoutAccountsService.completeOnboarding({
      expertId: expert.sub,
      onboardingId: dto.onboardingId,
      accountHolderName: dto.accountHolderName,
      accountNumber: dto.accountNumber,
      ifsc: dto.ifsc,
      code: dto.code,
      state: dto.state,
    });
  }

  /** List expert's payout account links. */
  @UseGuards(ExpertJwtAuthGuard)
  @Get("links")
  async listLinks(@CurrentExpert() expert: IExpert) {
    return this.payoutAccountsService.listLinks({ expertId: expert.sub });
  }

  /** Execute a payout from the expert's linked payout account. */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("payout")
  async executePayout(
    @CurrentExpert() expert: IExpert,
    @Body() dto: ExecutePayoutDto,
  ) {
    return this.payoutAccountsService.executePayout({
      expertId: expert.sub,
      payoutAccountId: dto.payoutAccountId,
      amount: dto.amount,
      currencyCode: dto.currencyCode,
      narration: dto.narration,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  /** Reconcile internal payout records against provider state.
   * Checks payouts with a provider reference against the provider's
   * current status and updates internal records on mismatch.
   */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("reconcile")
  async reconcile(@Body() dto: ReconcilePayoutsDto) {
    return this.payoutAccountsService.reconcilePayouts({
      statuses: dto.statuses,
      limit: dto.limit,
    });
  }

  /** Remove (unlink) a payout account from the expert. */
  @UseGuards(ExpertJwtAuthGuard)
  @Delete(":payoutAccountId")
  async removePayoutAccount(
    @CurrentExpert() expert: IExpert,
    @Param("payoutAccountId", ParseIntPipe) payoutAccountId: number,
  ) {
    return this.payoutAccountsService.removePayoutAccount({
      expertId: expert.sub,
      payoutAccountId,
    });
  }

  /** Set a payout account as the expert's primary. */
  @UseGuards(ExpertJwtAuthGuard)
  @Post(":payoutAccountId/set-primary")
  async setPrimaryPayoutAccount(
    @CurrentExpert() expert: IExpert,
    @Param("payoutAccountId", ParseIntPipe) payoutAccountId: number,
  ) {
    return this.payoutAccountsService.setPrimaryPayoutAccount({
      expertId: expert.sub,
      payoutAccountId,
    });
  }
}
