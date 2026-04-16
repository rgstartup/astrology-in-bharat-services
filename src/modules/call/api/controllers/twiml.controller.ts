import { Controller, Post, Get, Res, Req, Logger, Inject } from '@nestjs/common';
import { Response } from 'express';
import * as twilio from 'twilio';
import { Public } from '@/common/decorators/public.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession } from '../../infrastructure/persistence/entities/call-session.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

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
    twiml(@Req() req: any, @Res() res: Response) {
        try {
            // Extract SessionId from various possible locations in the request
            const sessionId = req.body?.sessionId || 
                            req.query?.sessionId || 
                            req.body?.customParameters?.sessionId || 
                            'DefaultSession';
                            
            const callerIdentity = req.body?.Caller || req.body?.From || 'unknown';

            this.logger.log(`[TwiML] Request for SessionId: ${sessionId} from ${callerIdentity}`);
            
            const VoiceResponse = twilio.twiml.VoiceResponse;
            const response = new VoiceResponse();

            // Fetch session and balance for dynamic TimeLimit
            let timeLimit = 3600; // Default 1 hour
            try {
                if (sessionId && sessionId !== 'DefaultSession') {
                    const session = await this.sessionRepo.findOne({
                        where: { id: parseInt(sessionId) }
                    });
                    if (session) {
                        const balance = await this.walletFacade.getBalance(session.user_id);
                        timeLimit = Math.floor((balance / session.price_per_minute) * 60);
                        this.logger.log(`[TwiML] Calculated TimeLimit for ${sessionId}: ${timeLimit}s (Balance: ${balance})`);
                        
                        if (timeLimit <= 0) {
                            response.say('Insufficient balance to continue this call.');
                            res.set('Content-Type', 'text/xml');
                            return res.status(200).send(response.toString());
                        }
                    }
                }
            } catch (err) {
                this.logger.error(`[TwiML] Error calculating timeLimit: ${err.message}`);
            }

            const conferenceRoomName = `call_room_${sessionId}`;
            
            // Apply timeLimit to the Dial
            const dial = response.dial({ timeLimit: timeLimit });
            dial.conference({
                startConferenceOnEnter: true,
                endConferenceOnExit: true,
                beep: 'false',
                muted: false,
                waitUrl: '', 
            }, conferenceRoomName);

            const twimlOutput = response.toString();
            
            res.set('Content-Type', 'text/xml');
            return res.status(200).send(twimlOutput);
        } catch (error) {
            this.logger.error(`[TwiML] Critical Error: ${error.message}`, error.stack);
            
            const VoiceResponse = twilio.twiml.VoiceResponse;
            const response = new VoiceResponse();
            response.say('A system error occurred. Please hang up and try again.');
            
            res.set('Content-Type', 'text/xml');
            return res.status(200).send(response.toString());
        }
    }
}
