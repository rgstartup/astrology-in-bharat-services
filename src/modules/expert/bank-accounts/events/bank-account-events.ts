export class BankAccountCreatedEvent {
  constructor(
    public readonly expertAccountId: string,
    public readonly accountId: string,
    public readonly accountHolderName: string,
  ) {}
}

export class BankAccountUpdatedEvent {
  constructor(
    public readonly expertAccountId: string,
    public readonly accountId: string,
  ) {}
}

export class PrimaryBankAccountChangedEvent {
  constructor(
    public readonly expertAccountId: string,
    public readonly oldAccountId?: string,
    public readonly newAccountId?: string,
  ) {}
}
