import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { Repository } from 'typeorm';
import { ClientAccount } from '../entities/account.entity';
import twilio from 'twilio';
import { VerifyPhoneOtpDto } from '../dto/phone-otp.dto';

@Injectable()
export class VerifyPhoneOtpUseCase {
  private twilioClient!: twilio.Twilio;

  constructor(
    @InjectRepository(ClientAccount)
    private readonly accountRepo: Repository<ClientAccount>,
  ) {}

  async execute(
    userId: string,
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
          const account = await this.accountRepo.findOne({
            where: [{ id: userId }, { user: { id: userId } }],
          });
          if (!account) {
            throw new BadRequestException('Account not found.');
          }

          account.phone = phone;
          account.phone_verified_at = new Date();
          await this.accountRepo.save(account);

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
        const account = await this.accountRepo.findOne({
          where: [{ id: userId }, { user: { id: userId } }],
        });
        if (!account) {
          throw new BadRequestException('Account not found.');
        }

        account.phone = phone;
        account.phone_verified_at = new Date();
        await this.accountRepo.save(account);

        return new BooleanMessage(true, 'Phone number verified successfully');
      } else {
        throw new BadRequestException('Invalid OTP or OTP expired.');
      }
    } catch (error: unknown) {
      const err = error as Error;
      throw new BadRequestException(`Verification failed: ${err.message}`);
    }
  }
}
