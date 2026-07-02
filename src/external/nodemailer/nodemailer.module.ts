import emailConfig from '@/config/email.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NodemailerProvider } from './nodemailer.provider';
import { NodeMailerService } from './nodemailer.service';

@Module({
  imports: [ConfigModule.forFeature(emailConfig)],
  providers: [NodemailerProvider, NodeMailerService],
  exports: [NodeMailerService],
})
export class NodemailerModule {}
