import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  Get,
  Query,
} from "@nestjs/common";
import { ExpertJwtAuthGuard } from "../../auth/guards/auth.guard";
import { CurrentExpert } from "../../auth/decorators/current-expert.decorator";
import { type IExpert } from "@/shared/types/access-token.payload";
import {
  InitiatePayoutOnboardingUseCase,
  CompletePayoutOnboardingUseCase,
  ExecutePayoutUseCase,
} from "../use-cases";

@Controller({
  path: "expert/payout-onboarding",
  version: "1",
})
export class PayoutOnboardingController {
  constructor(
    private readonly initiateUseCase: InitiatePayoutOnboardingUseCase,
    private readonly completeUseCase: CompletePayoutOnboardingUseCase,
    private readonly executePayoutUseCase: ExecutePayoutUseCase,
  ) {}

  /** Initiate payout onboarding for an expert.
   * RazorpayX: returns a form spec (account_holder_name, account_number, ifsc)
   * for the frontend to render bank details input.
   */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("initiate")
  async initiate(
    @CurrentExpert() expert: IExpert,
    @Body()
    body: {
      providerCode?: string;
      redirectUri?: string;
    },
  ) {
    return this.initiateUseCase.execute({
      expertId: expert.sub,
      providerCode: body?.providerCode ?? "razorpayx",
      redirectUri: body?.redirectUri,
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
    @Body()
    body: {
      onboardingId: number;
      accountHolderName?: string;
      accountNumber?: string;
      ifsc?: string;
      code?: string;
      state?: string;
    },
  ) {
    if (!body?.onboardingId) {
      throw new BadRequestException("onboardingId is required");
    }
    return this.completeUseCase.execute({
      expertId: expert.sub,
      onboardingId: body.onboardingId,
      accountHolderName: body.accountHolderName,
      accountNumber: body.accountNumber,
      ifsc: body.ifsc,
      code: body.code,
      state: body.state,
    });
  }

  /** List expert's payout account links. */
  @UseGuards(ExpertJwtAuthGuard)
  @Get("links")
  async listLinks(@CurrentExpert() expert: IExpert) {
    return { expertId: expert.sub };
  }

  /** Execute a payout from the expert's linked payout account. */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("payout")
  async executePayout(
    @CurrentExpert() expert: IExpert,
    @Body()
    body: {
      payoutAccountId: number;
      amount: number;
      currencyCode?: string;
      narration?: string;
      idempotencyKey?: string;
    },
  ) {
    if (!body?.payoutAccountId || body.amount == null) {
      throw new BadRequestException("payoutAccountId and amount are required");
    }
    return this.executePayoutUseCase.execute({
      expertId: expert.sub,
      payoutAccountId: body.payoutAccountId,
      amount: body.amount,
      currencyCode: body.currencyCode,
      narration: body.narration,
      idempotencyKey: body.idempotencyKey,
    });
  }
}
