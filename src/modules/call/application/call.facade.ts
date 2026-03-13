import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InitiateCallUseCase } from './use-cases/initiate-call.use-case';
import { AcceptCallUseCase } from './use-cases/accept-call.use-case';
import { EndCallUseCase } from './use-cases/end-call.use-case';
import { GetExpertCallSessionsUseCase, CallSessionFilter } from './use-cases/get-expert-sessions.use-case';
import { CallType } from '../infrastructure/persistence/entities/call-session.entity';

@Injectable()
export class CallFacade {
    constructor(
        @Inject(forwardRef(() => InitiateCallUseCase))
        private readonly initiateCallUseCase: InitiateCallUseCase,
        @Inject(forwardRef(() => AcceptCallUseCase))
        private readonly acceptCallUseCase: AcceptCallUseCase,
        @Inject(forwardRef(() => EndCallUseCase))
        private readonly endCallUseCase: EndCallUseCase,
        private readonly getExpertCallSessionsUseCase: GetExpertCallSessionsUseCase,
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

    async getExpertSessions(expertUserId: number, filter: CallSessionFilter) {
        return this.getExpertCallSessionsUseCase.execute(expertUserId, filter);
    }
}
