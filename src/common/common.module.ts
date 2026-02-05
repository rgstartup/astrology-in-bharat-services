import { Global, Module } from '@nestjs/common';
import { EmailService } from './infrastructure/mailing/email.service';

@Global()
@Module({
    providers: [EmailService],
    exports: [EmailService],
})
export class CommonModule { }
