import { Module } from '@nestjs/common';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { NodemailerModule } from './nodemailer/nodemailer.module';
import { ProkeralaModule } from './prokerala/prokerala.module';
import { PaymentGatewayModule } from './payment/payment-gateway.module';
import { StorageModule } from './storage/storage.module';
import { VoiceModule } from './voice/voice.module';
import { VideoModule } from './video/video.module';

@Module({
  imports: [
    CloudinaryModule,
    NodemailerModule,
    ProkeralaModule,
    PaymentGatewayModule,
    StorageModule,
    VoiceModule,
    VideoModule,
  ],
  exports: [
    CloudinaryModule,
    NodemailerModule,
    ProkeralaModule,
    PaymentGatewayModule,
    StorageModule,
    VoiceModule,
    VideoModule,
  ],
})
export class ExternalModule {}
