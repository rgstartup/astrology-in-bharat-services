import { CallType } from '../entities/call-session.entity';

export class CallInitiatedEvent {
  constructor(
    public readonly sessionId: number,
    public readonly userId: number,
    public readonly expert_id: number,
    public readonly type: CallType,
  ) {}
}

export class CallAcceptedEvent {
  constructor(
    public readonly sessionId: number,
    public readonly expert_id: number,
    public readonly type: CallType,
  ) {}
}

export class CallEndedEvent {
  constructor(
    public readonly sessionId: number,
    public readonly userId: number,
    public readonly expert_id: number,
    public readonly durationSeconds: number,
    public readonly finalPrice: number,
  ) {}
}
