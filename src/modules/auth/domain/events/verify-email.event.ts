export class VerifyEmailEvent {
  constructor(
    public readonly email: string,
    public readonly verification_token: string,
    public readonly roles: string[] = [],
  ) {}
}
