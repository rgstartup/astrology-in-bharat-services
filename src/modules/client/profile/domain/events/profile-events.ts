export class ProfileCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly profileId: string,
    public readonly data: any,
  ) {}
}

export class ProfileUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly profileId: string,
    public readonly data: any,
  ) {}
}
