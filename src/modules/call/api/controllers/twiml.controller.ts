import { Controller, Post, Get, Res, Req, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as twilio from 'twilio';
import { Public } from '@/common/decorators/public.decorator';

@Controller({
    path: 'call',
    version: '1',
})
export class TwimlController {
    private readonly logger = new Logger(TwimlController.name);

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

            const conferenceRoomName = `call_room_${sessionId}`;
            
            const dial = response.dial();
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
