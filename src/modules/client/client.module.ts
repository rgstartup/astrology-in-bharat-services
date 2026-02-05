import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/modules/users';
import { Address } from '@/common/domain/entities/address.entity';

import { ProfileClient } from './domain/entities/profile-client.entity';
import { ClientProfileController } from './interfaces/controllers/client-profile.controller';
import { ClientProfileService } from './application/services/client-profile.service';
import { IClientRepository } from './domain/repositories/client.repository.interface';
import { TypeOrmClientRepository } from './infrastructure/persistence/typeorm-client.repository';

import { CloudinaryModule } from '@/common/infrastructure/storage/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileClient, User, Address]),
    CloudinaryModule,
  ],
  controllers: [ClientProfileController],
  providers: [
    ClientProfileService,
    {
      provide: IClientRepository,
      useClass: TypeOrmClientRepository,
    },
  ],
  exports: [ClientProfileService],
})
export class ClientModule { }



