import { Module } from '@nestjs/common';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { NodemailerModule } from './nodemailer/nodemailer.module';

@Module({
  imports: [CloudinaryModule, NodemailerModule],
  exports: [CloudinaryModule, NodemailerModule],
})
export class ExternalModule {}
