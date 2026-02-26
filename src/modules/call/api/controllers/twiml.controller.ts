import { Controller, Post, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import * as twilio from 'twilio';

@Controller('call')
export class TwimlController {
    /**
     * Twilio will call this URL when a Voice call is initiated from the SDK.
     * It returns TwiML to instruct Twilio on what to do (e.g., connect to a room).
     * Set this URL as the "Voice Request URL" in your TwiML App on console.twilio.com
     */
    @Post('twiml')
    twiml(@Req() req: any, @Res() res: Response) {
        // Twilio sends params in Body for POST requests
        const sessionId = req.body.sessionId || 'DefaultSession';

        const VoiceResponse = twilio.twiml.VoiceResponse;
        const response = new VoiceResponse();

        // Dial into a unique conference room for this session
        const dial = response.dial();
        dial.conference({
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
        }, `call_room_${sessionId}`);

        res.type('text/xml');
        res.send(response.toString());
    }
}
