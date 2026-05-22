import { CallType } from '../../infrastructure/entities/call-session.entity';

export class CallInitiatedEvent {
    constructor(
        public readonly sessionId: string,
        public readonly userId: string,
        public readonly expertId: string,
        public readonly type: CallType,
    ) { }
}

export class CallAcceptedEvent {
    constructor(
        public readonly sessionId: string,
        public readonly expertId: string,
        public readonly type: CallType,
    ) { }
}

export class CallEndedEvent {
    constructor(
        public readonly sessionId: string,
        public readonly userId: string,
        public readonly expertId: string,
        public readonly durationSeconds: number,
        public readonly finalPrice: number,
    ) { }
}
