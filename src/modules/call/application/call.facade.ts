import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InitiateCallUseCase } from './use-cases/initiate-call.use-case';
import { AcceptCallUseCase } from './use-cases/accept-call.use-case';
import { EndCallUseCase } from './use-cases/end-call.use-case';
import { GetExpertCallSessionsUseCase, CallSessionFilter } from './use-cases/get-expert-sessions.use-case';
import { GetCallSessionUseCase } from './use-cases/get-call-session.use-case';
import { GetCallTokenUseCase } from './use-cases/get-call-token.use-case';
import { RejectCallUseCase } from './use-cases/reject-call.use-case';
import { CallType } from '../infrastructure/entities/call-session.entity';

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
        private readonly getCallSessionUseCase: GetCallSessionUseCase,
        private readonly getCallTokenUseCase: GetCallTokenUseCase,
        private readonly rejectCallUseCase: RejectCallUseCase,
    ) { }

    async initiate(userId: number, expertId: number, type: CallType = CallType.AUDIO) {
        return this.initiateCallUseCase.execute(userId, expertId, type);
    }

    async accept(expertId: number, sessionId: number) {
        return this.acceptCallUseCase.execute(expertId, sessionId);
    }

    async end(sessionId: number, terminatedBy?: string, reason?: string) {
        return this.endCallUseCase.execute(sessionId, terminatedBy, reason);
    }

    async getExpertSessions(expertUserId: number, filter: CallSessionFilter, options: { limit?: number; offset?: number; search?: string } = {}) {
        return this.getExpertCallSessionsUseCase.execute(expertUserId, filter, options);
    }

    async getSession(sessionId: number) {
        return this.getCallSessionUseCase.execute(sessionId);
    }

    async getCallToken(userId: number, sessionId: number) {
        return this.getCallTokenUseCase.execute(userId, sessionId);
    }

    async reject(sessionId: number) {
        return this.rejectCallUseCase.execute(sessionId);
    }
}
