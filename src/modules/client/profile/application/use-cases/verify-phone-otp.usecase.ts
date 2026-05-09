import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';
import twilio from 'twilio';

@Injectable()
export class VerifyPhoneOtpUseCase {
    private twilioClient: twilio.Twilio;

    constructor(
        @InjectRepository(ProfileClient)
        private readonly profileRepo: Repository<ProfileClient>,
    ) { }

    async execute(userId: number, phone: string, code: string): Promise<{ success: boolean; message: string }> {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (!accountSid || !authToken) {
            throw new BadRequestException('Twilio is not configured on the server.');
        }

        if (!serviceSid) {
            if (process.env.NODE_ENV === 'development') {
                if (code === '123456') {
                    // Bypass Twilio check and directly approve
                    const profile = await this.profileRepo.findOne({ where: { user: { id: userId } } });
                    if (!profile) {
                        throw new BadRequestException('Profile not found.');
                    }

                    profile.phone = phone; 
                    profile.phone_verified_at = new Date();
                    await this.profileRepo.save(profile);

                    return { success: true, message: 'Phone number verified successfully (Mock Mode).' };
                } else {
                    throw new BadRequestException('Invalid mock OTP. Use 123456.');
                }
            }
            throw new BadRequestException('Twilio Verify Service SID is not configured.');
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
                const profile = await this.profileRepo.findOne({ where: { user: { id: userId } } });
                if (!profile) {
                    throw new BadRequestException('Profile not found.');
                }

                profile.phone = phone; // save the exact phone string user input
                profile.phone_verified_at = new Date();
                await this.profileRepo.save(profile);

                return { success: true, message: 'Phone number verified successfully.' };
            } else {
                throw new BadRequestException('Invalid OTP or OTP expired.');
            }
        } catch (error: any) {
            throw new BadRequestException(`Verification failed: ${error.message}`);
        }
    }
}
