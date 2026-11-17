import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { Request, type Response } from "express";
import { Public } from "@/shared/decorators/public.decorator";
import { RazorpayXWebhookService } from "@/external/razorpayx/services/razorpayx-webhook.service";

@Controller({
  path: "webhooks/razorpayx",
  version: "1",
})
export class RazorpayXWebhookController {
  constructor(private readonly webhookService: RazorpayXWebhookService) {}

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
