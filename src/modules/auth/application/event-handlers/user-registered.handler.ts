import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import { EmailQueueService } from '@/core/queue/services/email-queue.service';
import { ConfigService } from '@nestjs/config';
import { hasRoles } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class UserRegisteredHandler {
  private readonly logger = new Logger(UserRegisteredHandler.name);
  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly configService: ConfigService,
  ) { }

  @OnEvent('auth.user.registered', { async: true })
  async handle(event: UserRegisteredEvent) {
    this.logger.debug('Email sending to the user');
    await this.emailQueueService.queueEmail({
      to: event.email,
      subject: 'Verify your email',
      html: this.buildTemplate(event),
    });
  }

  private buildTemplate(event: UserRegisteredEvent) {
    const roles = event.roles || [];
    const isExpert = hasRoles(roles, 'EXPERT');
    const isMerchant = hasRoles(roles, 'MERCHANT');

    this.logger.debug(
      `User roles: ${roles.join(', ')}. isExpert: ${isExpert}, isMerchant: ${isMerchant}`,
    );

    const configKey = isExpert
      ? 'email.expertFrontendUrl'
      : isMerchant
        ? 'email.merchantFrontendUrl'
        : 'email.frontendUrl';

    let frontendUrl = this.configService.get<string>(configKey);

    if (!frontendUrl) {
      if (isExpert) frontendUrl = process.env.ASTROLOGER_FRONTEND_URL;
      else if (isMerchant) frontendUrl = process.env.MERCHANT_FRONTEND_URL;
      else frontendUrl = process.env.FRONTEND_URL;
    }

    this.logger.debug(`Using frontendUrl: ${frontendUrl}`);

    const verifyLink = `${frontendUrl}/verify-email?verification_token=${event.verification_token}`;

    // Log verification link for easy local testing when email fails
    console.log('\n======================================================');
    console.log('✅ NEW USER REGISTERED! VERIFICATION LINK FOR TESTING:');
    console.log(verifyLink);
    console.log('======================================================\n');

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Welcome to Astrology in Bharat!</h2>
        <p>Hi ${event.name ?? 'there'},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #ff9800; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 13px;">${verifyLink}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `;
  }
}
