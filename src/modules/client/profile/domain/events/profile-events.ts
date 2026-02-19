export class ProfileCreatedEvent {
  constructor(
    public readonly userId: number,
    public readonly profileId: number,
    public readonly data: any,
  ) {}
}

export class ProfileUpdatedEvent {
  constructor(
    public readonly userId: number,
    public readonly profileId: number,
    public readonly data: any,
  ) {}
}
