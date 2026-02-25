import { Controller, Post, Res } from '@nestjs/common';
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
    twiml(@Res() res: Response) {
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const response = new VoiceResponse();

        // Dial into a conference room – used for peer-to-peer audio
        const dial = response.dial();
        dial.conference({
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
        }, 'AstroCallConference');

        res.type('text/xml');
        res.send(response.toString());
    }
}
