import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { MailService } from './mail.service';

@Module({
  providers: [NotificationService, MailService],
})
export class NotificationModule {}
