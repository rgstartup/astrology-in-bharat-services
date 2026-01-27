export class UserRegisteredEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly name: string = 'user',
    public readonly verification_token: string,
    public readonly role: string = 'client',
  ) { }
}

export class ConfirmEmailEvent {
  constructor(
    public readonly email: string,
    public readonly verification_token: string,
  ) { }
}

export class ResetPasswordEvent {
  constructor(
    public email: string,
    public password_reset_token: string,
    public origin?: string,
  ) { }
}

export class SendMagicLinkEvent {
  constructor(
    public email: string,
    public token: string,
  ) { }
}
