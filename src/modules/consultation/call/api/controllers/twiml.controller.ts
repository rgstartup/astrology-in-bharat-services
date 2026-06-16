import { Controller, Post, Get, Res, Req, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import * as twilio from 'twilio';
import { Public } from '@/common/decorators/public.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession } from '../../infrastructure/entities/call-session.entity';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

@Controller({
  path: 'call',
  version: '1',
})
export class TwimlController {
  private readonly logger = new Logger(TwimlController.name);

  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
    private readonly walletFacade: WalletFacade,
  ) {}

  /**
   * Twilio calls this URL when a Voice SDK call is initiated (device.connect()).
   */
  @Public()
  @Post('twiml')
  @Get('twiml')
  async twiml(@Req() req: Request, @Res() res: Response) {
    try {
      // Log full request details for debugging
      this.logger.log(`[TwiML] Received request. Method: ${req.method}`);
      this.logger.log(`[TwiML] Request Body: ${JSON.stringify(req.body)}`);
      this.logger.log(`[TwiML] Request Query: ${JSON.stringify(req.query)}`);

      const body = req.body as Record<string, unknown>;
      const query = req.query as Record<string, unknown>;
      const rawSessionId =
        (body?.sessionId as string) ||
        (query?.sessionId as string) ||
        ((body?.customParameters as Record<string, unknown>)
          ?.sessionId as string);

      const sessionId =
        rawSessionId && rawSessionId !== 'DefaultSession'
          ? rawSessionId
          : 'DefaultSession';
      const callerIdentity =
        (body?.Caller as string) || (body?.From as string) || 'unknown';

      this.logger.log(
        `[TwiML] Final SessionId for processing: ${sessionId} (from caller: ${callerIdentity})`,
      );

      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();

      // Fetch session and balance for dynamic TimeLimit
      let timeLimit = 3600; // Default 1 hour

      if (sessionId !== 'DefaultSession') {
        const session = await this.sessionRepo.findOne({
          where: { id: sessionId },
        });

        if (session) {
          const balance = await this.walletFacade.getBalance(session.client_id, 'client_id');
          // Safety check: ensure price_per_minute is a positive number to avoid division by zero or Infinity
          const price = session.price_per_minute || 0;

          if (price > 0) {
            timeLimit = Math.floor((balance / price) * 60);
            this.logger.log(
              `[TwiML] Calculated TimeLimit for session ${sessionId}: ${timeLimit}s (Balance: ${balance}, Price: ${price})`,
            );
          } else {
            this.logger.warn(
              `[TwiML] Session ${sessionId} has zero or invalid price. Using default time limit.`,
            );
          }

          if (timeLimit <= 0) {
            this.logger.warn(
              `[TwiML] Insufficient balance for session ${sessionId}. Hanging up.`,
            );
            response.say(
              "You don't have enough money to talk 5 minutes to expert. Please add some more money in your wallet.",
            );
            res.set('Content-Type', 'text/xml');
            return res.status(200).send(response.toString());
          }
        } else {
          this.logger.warn(
            `[TwiML] Session ${sessionId} not found in database.`,
          );
        }
      } else {
        this.logger.log(`[TwiML] Using DefaultSession (No limit lookup)`);
      }

      const conferenceRoomName = `call_room_${sessionId}`;

      // Apply timeLimit to the Dial
      const dial = response.dial({ timeLimit: timeLimit });
      dial.conference(
        {
          startConferenceOnEnter: true,
          endConferenceOnExit: true,
          beep: 'false',
          muted: false,
          waitUrl: '',
        },
        conferenceRoomName,
      );

      const twimlOutput: string = response.toString() as string;
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twimlOutput);
    } catch (error: unknown) {
      this.logger.error(
        `[TwiML] Critical Error: ${(error as Error).message}`,
        (error as Error).stack,
      );

      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      response.say('A system error occurred. Please hang up and try again.');

      res.set('Content-Type', 'text/xml');
      return res.status(200).send(response.toString());
    }
  }
}
