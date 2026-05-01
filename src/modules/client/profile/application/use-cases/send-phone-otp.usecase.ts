import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileClient } from '../../infrastructure/persistence/entities/profile-client.entity';
import * as twilio from 'twilio';

@Injectable()
export class SendPhoneOtpUseCase {
    private twilioClient: twilio.Twilio;

    constructor(
        @InjectRepository(ProfileClient)
        private readonly profileRepo: Repository<ProfileClient>,
    ) { }

    async execute(userId: string, phone: string): Promise<{ success: boolean; message: string }> {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (!accountSid || !authToken) {
            throw new BadRequestException('Twilio is not configured on the server. Missing Account SID or Auth Token.');
        }
        if (!serviceSid) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`[Twilio Mock] Service SID missing. Using mock OTP '123456' for ${phone}`);
                return { success: true, message: 'OTP sent successfully (Mock Mode: 123456)' };
            }
            throw new BadRequestException('Twilio Verify Service SID is not configured in .env');
        }

        if (!this.twilioClient) {
            this.twilioClient = twilio(accountSid, authToken);
        }

        const existingProfile = await this.profileRepo.findOne({ where: { phone } });
        if (existingProfile && existingProfile.better_auth_user_id !== userId && existingProfile.phone_verified_at) {
            throw new BadRequestException('This phone number is already verified by another user.');
        }

        try {
            let formattedPhone = phone.trim();
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = `+91${formattedPhone}`;
            }

            await this.twilioClient.verify.v2
                .services(serviceSid)
                .verifications.create({ to: formattedPhone, channel: 'sms' });

            return { success: true, message: 'OTP sent successfully to ' + formattedPhone };
        } catch (error: any) {
            throw new BadRequestException(`Failed to send OTP: ${error.message}`);
        }
    }
}
