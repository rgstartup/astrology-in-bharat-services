import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';

interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: NodeMailerService) {
    super();
  }

  async process(job: Job<SendEmailPayload, unknown, string>): Promise<void> {
    this.logger.log(`[EmailProcessor] Processing email job ${job.id} for ${job.data.to}...`);

    try {
      await this.mailerService.sendEmail(
        job.data.to,
        job.data.subject,
        job.data.html,
      );
      this.logger.log(`[EmailProcessor] Email job ${job.id} completed successfully for ${job.data.to}.`);
    } catch (error) {
      this.logger.error(`[EmailProcessor] Failed to send email for job ${job.id} to ${job.data.to}:`, error);
      throw error; // This will trigger BullMQ's retry mechanism
    }
  }
}
