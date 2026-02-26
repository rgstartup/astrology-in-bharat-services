import { Controller, Post, Get, Res, Req } from '@nestjs/common';
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
    @Get('twiml') // Allow GET for easy browser testing
    twiml(@Req() req: any, @Res() res: Response) {
        // Twilio sends params in Body for POST, or Query for GET
        const sessionId = req.body?.sessionId || req.query?.sessionId || 'DefaultSession';

        console.log(`[Twilio] TwiML request received.`);
        console.log(`[Twilio] Query:`, JSON.stringify(req.query));
        console.log(`[Twilio] Body:`, JSON.stringify(req.body));
        console.log(`[Twilio] Using SessionId: ${sessionId}`);

        const VoiceResponse = twilio.twiml.VoiceResponse;
        const response = new VoiceResponse();

        // Dial into a unique conference room for this session
        const dial = response.dial();
        dial.conference({
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
            waitUrl: '', // Removes the "Thank you for using Twilio" hold music
        }, `call_room_${sessionId}`);

        res.type('text/xml');
        res.send(response.toString());
    }
}
