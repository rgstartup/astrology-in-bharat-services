import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { Repository } from 'typeorm';
import { ClientAccount } from '../entities/account.entity';
import twilio from 'twilio';
import { SendPhoneOtpDto } from '../dto/phone-otp.dto';

@Injectable()
export class SendPhoneOtpUseCase {
  private twilioClient!: twilio.Twilio;

  constructor(
    @InjectRepository(ClientAccount)
    private readonly accountRepo: Repository<ClientAccount>,
  ) {}

  async execute(userId: string, dto: SendPhoneOtpDto): Promise<BooleanMessage> {
    const { phone } = dto;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken) {
      throw new BadRequestException(
        'Twilio is not configured on the server. Missing Account SID or Auth Token.',
      );
    }
    if (!serviceSid) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Twilio Mock] Service SID missing. Using mock OTP '123456' for ${phone}`,
        );
        return {
          success: true,
          message: 'OTP sent successfully (Mock Mode: 123456)',
        };
      }

      throw new BadRequestException(
        'Twilio Verify Service SID is not configured in .env',
      );
    }

    if (!this.twilioClient) {
      this.twilioClient = twilio(accountSid, authToken);
    }

    const existingAccount = await this.accountRepo.findOne({
      where: { phone },
      relations: ['user'],
    });

    if (
      existingAccount &&
      existingAccount.user?.id !== userId &&
      existingAccount.id !== userId &&
      existingAccount.phone_verified_at
    ) {
      throw new BadRequestException(
        'This phone number is already verified by another user.',
      );
    }

    try {
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone}`;
      }

      await this.twilioClient.verify.v2
        .services(serviceSid)
        .verifications.create({ to: formattedPhone, channel: 'sms' });

      return {
        success: true,
        message: 'OTP sent successfully to ' + formattedPhone,
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new BadRequestException(`Failed to send OTP: ${err.message}`);
    }
  }
}
