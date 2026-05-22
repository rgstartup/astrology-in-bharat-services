export class ProfileUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly profileId: number,
    public readonly data: any,
  ) {}
}

export class KycStatusChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly profileId: number,
    public readonly status: string,
    public readonly reason?: string,
  ) {}
}

export class ExpertStatusChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly isAvailable: boolean,
  ) {}
}
