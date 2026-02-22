import { Module } from '@nestjs/common';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { NodemailerModule } from './nodemailer/nodemailer.module';
import { ProkeralaModule } from './prokerala/prokerala.module';
import { RazorpayModule } from './razorpay/razorpay.module';

@Module({
  imports: [CloudinaryModule, NodemailerModule, ProkeralaModule, RazorpayModule],
  exports: [CloudinaryModule, NodemailerModule, ProkeralaModule, RazorpayModule],
})
export class ExternalModule {}
