import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  async queueEmail(payload: SendEmailPayload) {
    this.logger.log(`[EmailQueue] Adding email job for ${payload.to} to queue...`);

    try {
      // Add job to BullMQ
      const job = await this.emailQueue.add('send-email', payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(`[EmailQueue] Email job added successfully with ID: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`[EmailQueue] Failed to add email job to queue for ${payload.to}:`, error);
      throw error;
    }
  }
}
