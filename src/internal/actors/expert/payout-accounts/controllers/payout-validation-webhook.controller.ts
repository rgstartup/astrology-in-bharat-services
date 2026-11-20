import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { Request, type Response } from "express";
import { Public } from "@/shared/decorators/public.decorator";
import { PayoutValidationWebhookService } from "@/internal/actors/expert/payout-accounts/services/payout-validation-webhook.service";

@Controller({
  path: "webhooks/payout-validation",
  version: "1",
})
export class PayoutValidationWebhookController {
  constructor(
    private readonly webhookService: PayoutValidationWebhookService,
  ) {}

  @Post()
  @Public()
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException("Missing raw body");
    }

    const headers = req.headers as Record<
      string,
      string | string[] | undefined
    >;

    const result = await this.webhookService.handleWebhook(rawBody, headers);

    return res.status(200).send(result.message);
  }
}
