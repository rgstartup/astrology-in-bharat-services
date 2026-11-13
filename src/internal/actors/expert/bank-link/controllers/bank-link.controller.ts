import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  BadRequestException,
} from "@nestjs/common";
import { ExpertJwtAuthGuard } from "../../auth/guards/auth.guard";
import { Public } from "@/shared/decorators/public.decorator";
import { CurrentExpert } from "../../auth/decorators/current-expert.decorator";
import { type IExpert } from "@/shared/types/access-token.payload";
import { BankLinkService } from "../bank-link.service";

@Controller({
  path: "expert/bank-accounts",
  version: "1",
})
export class BankLinkController {
  constructor(private readonly bankLinkService: BankLinkService) {}

  /** Initiate payout-account link.
   * RazorpayX: returns form spec for frontend to render bank details input.
   */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("link/initiate")
  async initiate(
    @CurrentExpert() expert: IExpert,
    @Body() body: { redirectUri?: string; accountHolderName?: string; accountNumber?: string; ifsc?: string },
  ) {
    return this.bankLinkService.initiate({
      expert,
      redirectUri: body?.redirectUri,
      accountHolderName: body?.accountHolderName,
      accountNumber: body?.accountNumber,
      ifsc: body?.ifsc,
    });
  }

  /** Complete payout-account link.
   * RazorpayX: creates RazorpayX contact + fund account from bank details.
   */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("link/complete")
  async complete(
    @CurrentExpert() expert: IExpert,
    @Body() body: { accountHolderName?: string; accountNumber?: string; ifsc?: string },
  ) {
    return this.bankLinkService.complete({
      accountHolderName: body?.accountHolderName,
      accountNumber: body?.accountNumber,
      ifsc: body?.ifsc,
    });
  }

  /** Validate penny-drop amount (RazorpayX direct API flow). */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("link/validate-penny-drop")
  async validatePennyDrop(
    @CurrentExpert() expert: IExpert,
    @Body() body: { validationId: string; amount: number },
  ) {
    if (!body?.validationId || body.amount == null) {
      throw new BadRequestException("validationId and amount are required");
    }
    return this.bankLinkService.validatePennyDrop(body.validationId, body.amount);
  }

  /** List expert's payout account links. */
  @UseGuards(ExpertJwtAuthGuard)
  @Get()
  async list(@CurrentExpert() expert: IExpert) {
    return this.bankLinkService.list(expert);
  }

  /** Refresh payout account link status from provider. */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("link/refresh-status")
  async refreshStatus(@CurrentExpert() expert: IExpert) {
    return this.bankLinkService.refreshStatus(expert);
  }

  /** Set which linked payout account is primary for this expert. */
  @UseGuards(ExpertJwtAuthGuard)
  @Post("link/set-primary")
  async setPrimary(
    @CurrentExpert() expert: IExpert,
    @Body() body: { payoutPlatformAccountId?: number },
  ) {
    if (!body?.payoutPlatformAccountId) {
      throw new BadRequestException("payoutPlatformAccountId is required");
    }
    return this.bankLinkService.setPrimary(expert, undefined, body.payoutPlatformAccountId);
  }

  /** Delete / unlink payout account. */
  @UseGuards(ExpertJwtAuthGuard)
  @HttpCode(204)
  @Delete()
  async delete(
    @CurrentExpert() expert: IExpert,
    @Query() query: { payoutPlatformAccountId?: number },
  ) {
    await this.bankLinkService.delete(expert, query?.payoutPlatformAccountId);
    return;
  }
}
