import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { KycStatusChangedEvent } from '../../domain/events/profile-events';
import { ExpertGateway } from '../../api/gateways/expert.gateway';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';

@Injectable()
export class KycStatusChangedHandler {
  private readonly logger = new Logger(KycStatusChangedHandler.name);

  constructor(
    private readonly nodemailerService: NodeMailerService,
    private readonly expertGateway: ExpertGateway,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @OnEvent('expert.kyc.status-changed', { async: true })
  async handle(event: KycStatusChangedEvent) {
    this.logger.log(`Handling KYC status change to ${event.status} for expert ${event.userId}`);

    // Notify via socket
    this.expertGateway.notifyKycStatusUpdate(event.userId, event.status, event.reason);

    // If rejected, send email
    if (event.status === 'rejected' && event.reason) {
      const user = await this.userRepo.findOne({ where: { id: event.userId } });
      if (user && user.email) {
        const subject = 'Action Required: Update Your Profile - Astrology in Bharat';
        const html = `
          <h2>Hello ${user.name},\n\nYour profile verification was not successful.\nReason: ${event.reason || 'Details not provided.'}\n\nPlease update your profile and resubmit.</h2>
          <hr/>
          <h3>Hello ${user.name},</h3>
          <p>Your profile verification was not successful.</p>
          <p><strong>Reason:</strong> ${event.reason || 'Details not provided.'}</p>
          <p>Please log in to your dashboard to make the necessary changes and resubmit your profile for verification.</p>
          <p>Best Regards,<br/>Astrology in Bharat Team</p>
        `;
        await this.nodemailerService.sendEmail(user.email, subject, html);
      }
    }
  }
}
