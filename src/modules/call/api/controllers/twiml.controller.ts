import { Controller, Post, Get, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import * as twilio from 'twilio';

@Controller('call')
export class TwimlController {
    /**
     * Twilio calls this URL when a Voice SDK call is initiated (device.connect()).
     * Both the user and expert call this endpoint with { sessionId } as a param.
     * TwiML puts them both into the same conference room: call_room_{sessionId}
     *
     * Set this URL as the "Voice Request URL" in your TwiML App on console.twilio.com
     */
    @Post('twiml')
    @Get('twiml') // Allow GET for easy browser testing
    twiml(@Req() req: any, @Res() res: Response) {
        try {
            // Twilio sends custom params (set via device.connect({ params })) in the request body
            // Note: Different SDK versions/configs might send these in different ways.
            const sessionId = req.body?.sessionId || req.query?.sessionId || req.body?.customParameters?.sessionId || 'DefaultSession';
            const callerIdentity = req.body?.Caller || req.body?.From || 'unknown';

            console.log(`[TwiML Debug] 🚀 SessionId: ${sessionId}, CallerIdentity: ${callerIdentity}`);
            
            const VoiceResponse = twilio.twiml.VoiceResponse;
            const response = new VoiceResponse();

            const conferenceRoomName = `call_room_${sessionId}`;
            console.log(`[TwiML Debug] 📞 Putting caller into conference: ${conferenceRoomName}`);

            const dial = response.dial();
            dial.conference({
                startConferenceOnEnter: true,
                endConferenceOnExit: true,
                beep: 'false',
                muted: false,
                waitUrl: '', // Explicitly empty for silence
            }, conferenceRoomName);

            const twimlOutput = response.toString();
            console.log(`[TwiML Debug] 📤 Responding with TwiML:`, twimlOutput);

            res.header('Content-Type', 'application/xml');
            return res.status(200).send(twimlOutput);
        } catch (error) {
            console.error('[TwiML Debug] ❌ Error generating TwiML:', error);
            const VoiceResponse = twilio.twiml.VoiceResponse;
            const response = new VoiceResponse();
            response.say('A server error occurred in call routing.');
            res.header('Content-Type', 'application/xml');
            return res.status(200).send(response.toString());
        }
    }
}
