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
        // Twilio sends custom params (set via device.connect({ params })) in the request body
        const sessionId = req.body?.sessionId || req.query?.sessionId || 'DefaultSession';
        const callerIdentity = req.body?.Caller || req.body?.From || 'unknown';

        console.log(`[TwiML] ✅ Request received.`);
        console.log(`[TwiML] 📋 Query:`, JSON.stringify(req.query));
        console.log(`[TwiML] 📋 Body:`, JSON.stringify(req.body));
        console.log(`[TwiML] 🚀 SessionId: ${sessionId}, CallerIdentity: ${callerIdentity}`);

        const VoiceResponse = twilio.twiml.VoiceResponse;
        const response = new VoiceResponse();

        const conferenceRoomName = `call_room_${sessionId}`;
        console.log(`[TwiML] 📞 Putting caller into conference: ${conferenceRoomName}`);

        // Both user & expert are placed into the SAME conference room.
        // startConferenceOnEnter: true  → conference starts as soon as first participant joins
        // endConferenceOnExit: true     → conference ends when any participant leaves
        // NOTE: Do NOT set waitUrl to empty string '' — it causes Twilio to play
        //       the default "Thank you for using Twilio" message.
        //       Omitting waitUrl completely silences the hold period.
        const dial = response.dial();
        dial.conference({
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
            // waitUrl intentionally omitted → silent wait, no hold music or Twilio messages
            beep: 'false' as any,       // No beep sound when joining
            muted: false,               // Participants are NOT muted by default
        }, conferenceRoomName);

        const twimlOutput = response.toString();
        console.log(`[TwiML] 📤 Responding with TwiML:`, twimlOutput);

        res.type('text/xml');
        res.send(twimlOutput);
    }
}

