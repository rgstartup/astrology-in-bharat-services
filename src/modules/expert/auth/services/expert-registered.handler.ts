import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { EmailQueueService } from '@/core/queue/services/email-queue.service';

interface ExpertRegisteredEvent {
  email: string;
  name?: string;
  verification_token: string;
}

@Injectable()
export class ExpertRegisteredHandler {
  constructor(
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent('auth.expert.registered', { async: true })
  handle(event: ExpertRegisteredEvent) {
    const frontendUrl = this.config.get<string>('email.frontendUrl');
    const link = `${frontendUrl}/verify-email?verification_token=${event.verification_token}`;
    return this.emailQueue.queueEmail({
      to: event.email,
      subject: 'Verify your expert account',
      html: `<p>Hi ${event.name ?? 'there'},</p><p>Verify your expert account:</p><p><a href="${link}">Verify Email Address</a></p>`,
    });
  }
}
