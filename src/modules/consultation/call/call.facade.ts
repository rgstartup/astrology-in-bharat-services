import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InitiateCallUseCase } from './use-cases/initiate-call.use-case';
import { AcceptCallUseCase } from './use-cases/accept-call.use-case';
import { EndCallUseCase } from './use-cases/end-call.use-case';
import {
  GetExpertCallSessionsUseCase,
  CallSessionFilter,
} from './use-cases/get-expert-sessions.use-case';
import { GetCallSessionUseCase } from './use-cases/get-call-session.use-case';
import { GetCallTokenUseCase } from './use-cases/get-call-token.use-case';
import { RejectCallUseCase } from './use-cases/reject-call.use-case';
import { CountExpertCallSessionsUseCase } from './use-cases/count-expert-sessions.use-case';
import { GetExpertCallsByDateUseCase } from './use-cases/get-expert-calls-by-date.use-case';
import { GetCallEarningsUseCase } from './use-cases/get-call-earnings.use-case';
import { ConvertToPaidUseCase } from './use-cases/convert-to-paid.use-case';
import { ResolveSessionDetailsUseCase } from './use-cases/resolve-session-details.use-case';
import { CallType, CallSessionStatus } from './entities/call-session.entity';

import { InitiateCallDto } from './dto/initiate-call.dto';
import { EndCallDto } from './dto/end-call.dto';
import { GetCallSessionsDto } from './dto/get-call-sessions.dto';

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
    private readonly countExpertCallSessionsUseCase: CountExpertCallSessionsUseCase,
    private readonly getExpertCallsByDateUseCase: GetExpertCallsByDateUseCase,
    private readonly getCallEarningsUseCase: GetCallEarningsUseCase,
    private readonly convertToPaidUseCase: ConvertToPaidUseCase,
    private readonly resolveSessionDetailsUseCase: ResolveSessionDetailsUseCase,
  ) {}

  async initiate(
    clientId: number,
    dtoOrExpertId: InitiateCallDto | number,
    type: CallType = CallType.AUDIO,
  ) {
    if (typeof dtoOrExpertId === 'number') {
      return this.initiateCallUseCase.execute(clientId, {
        expert_id: dtoOrExpertId,
        type,
      });
    }
    return this.initiateCallUseCase.execute(clientId, dtoOrExpertId);
  }

  async accept(expertProfileId: number, sessionId: number) {
    return this.acceptCallUseCase.execute(expertProfileId, sessionId);
  }

  async end(
    dtoOrSessionId: EndCallDto | number,
    terminatedBy?: string,
    reason?: string,
  ) {
    if (typeof dtoOrSessionId === 'number') {
      return this.endCallUseCase.execute({
        sessionId: dtoOrSessionId,
        endedBy: terminatedBy,
        reason,
      });
    }
    return this.endCallUseCase.execute(dtoOrSessionId);
  }

  async convertToPaid(sessionId: number) {
    return this.convertToPaidUseCase.execute(sessionId);
  }

  async getExpertSessions(
    expertProfileId: number,
    filter: CallSessionFilter,
    options: GetCallSessionsDto = {},
  ) {
    return this.getExpertCallSessionsUseCase.execute(
      expertProfileId,
      filter,
      options,
    );
  }

  async resolveSessionDetails(sessionIds: (string | number)[]) {
    return this.resolveSessionDetailsUseCase.execute(sessionIds);
  }

  async getSession(sessionId: number) {
    return this.getCallSessionUseCase.execute(sessionId);
  }

  async getCallToken(profileId: number, sessionId: number) {
    return this.getCallTokenUseCase.execute(profileId, sessionId);
  }

  async reject(sessionId: number) {
    return this.rejectCallUseCase.execute(sessionId);
  }

  async getExpertRevenueAndCount(expertProfileId: number) {
    return this.getExpertCallSessionsUseCase.getRevenueAndCount(
      expertProfileId,
    );
  }

  async getAllExpertsRevenueAndCount() {
    return this.getExpertCallSessionsUseCase.getAllExpertsRevenueAndCount();
  }

  async getExpertSessionCount(
    expert_id: number,
    options: {
      status?: CallSessionStatus | CallSessionStatus[];
      startDate?: Date;
    } = {},
  ) {
    return this.countExpertCallSessionsUseCase.execute(expert_id, options);
  }

  async getExpertCallsByDate(
    expert_id: number,
    startDate: Date,
    endDate: Date,
  ) {
    return this.getExpertCallsByDateUseCase.execute(
      expert_id,
      startDate,
      endDate,
    );
  }

  async getEarnings(dateLimit: Date, type: 'audio' | 'video') {
    return this.getCallEarningsUseCase.execute(dateLimit, type);
  }
}
