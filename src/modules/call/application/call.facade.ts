import { Injectable } from '@nestjs/common';
import { AcceptCallUseCase } from './use-cases/accept-call.use-case';
import { EndCallUseCase } from './use-cases/end-call.use-case';
import { InitiateCallUseCase } from './use-cases/initiate-call.use-case';
import { CallType } from '../infrastructure/persistence/entities/call-session.entity';

@Injectable()
export class CallFacade {
    constructor(
        private readonly initiateCallUseCase: InitiateCallUseCase,
        private readonly acceptCallUseCase: AcceptCallUseCase,
        private readonly endCallUseCase: EndCallUseCase,
    ) { }

    async initiate(userId: number, expertId: number, type: CallType = CallType.AUDIO) {
        return this.initiateCallUseCase.execute(userId, expertId, type);
    }

    async accept(expertId: number, sessionId: number) {
        return this.acceptCallUseCase.execute(expertId, sessionId);
    }

    async end(sessionId: number) {
        return this.endCallUseCase.execute(sessionId);
    }
}
