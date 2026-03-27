export class UserRegisteredEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly name: string = 'user',
    public readonly verification_token: string,
    public readonly roles: string[] = [],
  ) {}
}
