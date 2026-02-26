import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { InitiateCallUseCase } from '../../application/use-cases/initiate-call.use-case';
import { AcceptCallUseCase } from '../../application/use-cases/accept-call.use-case';
import { EndCallUseCase } from '../../application/use-cases/end-call.use-case';
import { CallType } from '../../infrastructure/persistence/entities/call-session.entity';

@Controller('call')
@UseGuards(JwtAuthGuard)
export class CallController {
    constructor(
        private readonly initiateCallUseCase: InitiateCallUseCase,
        private readonly acceptCallUseCase: AcceptCallUseCase,
        private readonly endCallUseCase: EndCallUseCase,
    ) { }

    @Post('initiate')
    async initiate(
        @Req() req: any,
        @Body() body: { expertId: number; type?: CallType }
    ) {
        console.log(`[CallController] Initiate call: userId=${req.user.id}, expertId=${body.expertId}, type=${body.type || CallType.AUDIO}`);
        return this.initiateCallUseCase.execute(
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
        return this.acceptCallUseCase.execute(
            req.user.id,
            body.sessionId
        );
    }

    @Post('end')
    async end(
        @Body() body: { sessionId: number }
    ) {
        console.log(`[CallController] End call: sessionId=${body.sessionId}`);
        return this.endCallUseCase.execute(body.sessionId);
    }
}
