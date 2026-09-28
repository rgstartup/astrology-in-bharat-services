import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientAccounts } from '@/core/drizzledb/schema';
import twilio from 'twilio';
import { VerifyPhoneOtpDto } from '../dto/phone-otp.dto';

@Injectable()
export class VerifyPhoneOtpUseCase {
  private twilioClient!: twilio.Twilio;

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    userId: number | string,
    dto: VerifyPhoneOtpDto,
  ): Promise<BooleanMessage> {
    const { phone, code } = dto;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken) {
      throw new BadRequestException('Twilio is not configured on the server.');
    }

    if (!serviceSid) {
      if (process.env.NODE_ENV === 'development') {
        if (code === '123456') {
          await this.markPhoneVerified(Number(userId), phone);

          return new BooleanMessage(
            true,
            'Phone number verified successfully (Mock Mode).',
          );
        } else {
          throw new BadRequestException('Invalid mock OTP. Use 123456.');
        }
      }
      throw new BadRequestException(
        'Twilio Verify Service SID is not configured.',
      );
    }

    if (!this.twilioClient) {
      this.twilioClient = twilio(accountSid, authToken);
    }

    try {
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone}`;
      }

      const verificationCheck = await this.twilioClient.verify.v2
        .services(serviceSid)
        .verificationChecks.create({ to: formattedPhone, code });

      if (verificationCheck.status === 'approved') {
        await this.markPhoneVerified(Number(userId), phone);

        return new BooleanMessage(true, 'Phone number verified successfully');
      } else {
        throw new BadRequestException('Invalid OTP or OTP expired.');
      }
    } catch (error: unknown) {
      const err = error as Error;
      throw new BadRequestException(`Verification failed: ${err.message}`);
    }
  }

  private async markPhoneVerified(userId: number, phone: string) {
    const [account] = await this.db
      .select({ id: clientAccounts.id })
      .from(clientAccounts)
      .where(
        or(eq(clientAccounts.id, userId), eq(clientAccounts.user_id, userId)),
      )
      .limit(1);

    if (!account) {
      throw new BadRequestException('Account not found.');
    }

    await this.db
      .update(clientAccounts)
      .set({ phone, phone_verified_at: new Date(), updated_at: new Date() })
      .where(eq(clientAccounts.id, account.id));
  }
}
