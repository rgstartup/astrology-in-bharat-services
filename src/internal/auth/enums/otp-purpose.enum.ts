/**
 * OTP purpose values (`auth.otp.purpose`).
 *
 * Lives in its own module (instead of `otp.entity.ts`) so Drizzle schema
 * files can import it without pulling the TypeORM entity graph into
 * `drizzle-kit generate`.
 */
export enum OtpPurposeEnum {
  REGISTRATION = 'registration',
  FORGOT_PASSWORD = 'forgot_password',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
}
