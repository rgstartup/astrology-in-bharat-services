import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';
import { UserRegisteredEvent } from './events/user-register.event';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  constructor(private mailService: MailService) {}

  @OnEvent('user:register')
  async handleUserRegistered(event: UserRegisteredEvent) {
    await this.mailService.sendMail(
      event.email,
      'Welcome to MyApp!',
      `Hi ${event.name}, thanks for signing up!`,
      `<h1>Welcome, ${event.name}</h1><p>Thanks for signing up!</p>`,
    );
  }
}
