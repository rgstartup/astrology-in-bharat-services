export class ProfileUpdatedEvent {
  constructor(
    public readonly userId: number,
    public readonly profileId: number,
    public readonly data: any,
  ) {}
}

export class ExpertStatusChangedEvent {
  constructor(
    public readonly userId: number,
    public readonly isAvailable: boolean,
  ) {}
}
