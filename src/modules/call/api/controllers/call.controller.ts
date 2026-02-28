import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CallType } from '../../infrastructure/persistence/entities/call-session.entity';
import { CallFacade } from '../../application/call.facade';

@Controller('call')
@UseGuards(JwtAuthGuard)
export class CallController {
    constructor(
        private readonly callFacade: CallFacade,
    ) { }

    @Post('initiate')
    async initiate(
        @Req() req: any,
        @Body() body: { expertId: number; type?: CallType }
    ) {
        console.log(`[CallController] Initiate call: userId=${req.user.id}, expertId=${body.expertId}, type=${body.type || CallType.AUDIO}`);
        return this.callFacade.initiate(
            req.user.id,
            body.expertId,
            body.type || CallType.AUDIO
        );
    }

    @Post('accept')
    async accept(
        @Req() req: any,
        @Body() body: { sessionId: number }
    ) {
        console.log(`[CallController] Accept call: userId=${req.user.id}, sessionId=${body.sessionId}`);
        return this.callFacade.accept(
            req.user.id,
            body.sessionId
        );
    }

    @Post('end')
    async end(
        @Body() body: { sessionId: number }
    ) {
        console.log(`[CallController] End call: sessionId=${body.sessionId}`);
        return this.callFacade.end(body.sessionId);
    }
}
