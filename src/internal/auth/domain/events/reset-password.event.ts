export class ResetPasswordEvent {
  constructor(
    public email: string,
    public password_reset_token: string,
  ) {}
}
