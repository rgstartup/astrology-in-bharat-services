export class BankAccountCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly accountId: number,
    public readonly accountHolderName: string,
  ) {}
}

export class BankAccountUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly accountId: number,
  ) {}
}

export class PrimaryBankAccountChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly oldAccountId?: number,
    public readonly newAccountId?: number,
  ) {}
}
