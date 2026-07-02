export class ProfileCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly profileId: string,
    public readonly data: Record<string, unknown>,
  ) {}
}

export class ProfileUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly profileId: string,
    public readonly data: Record<string, unknown>,
  ) {}
}
