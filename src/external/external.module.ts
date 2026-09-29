import { Module } from '@nestjs/common';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { NodemailerModule } from './nodemailer/nodemailer.module';
import { ProkeralaModule } from './prokerala/prokerala.module';
import { PaymentGatewayModule } from './payment/payment-gateway.module';

@Module({
  imports: [
    CloudinaryModule,
    NodemailerModule,
    ProkeralaModule,
    PaymentGatewayModule,
  ],
  exports: [
    CloudinaryModule,
    NodemailerModule,
    ProkeralaModule,
    PaymentGatewayModule,
  ],
})
export class ExternalModule {}
