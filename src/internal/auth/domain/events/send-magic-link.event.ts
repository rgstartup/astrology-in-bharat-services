export class SendMagicLinkEvent {
  constructor(
    public email: string,
    public token: string,
  ) {}
}
