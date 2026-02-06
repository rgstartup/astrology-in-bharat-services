import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address } from '@/common/domain/entities/address.entity';
import { CloudinaryModule } from '@/common/infrastructure/storage/cloudinary/cloudinary.module';
import { User } from '@/modules/users/domain/entities/user.entity';
import { ClientProfileService } from './application/services/client-profile.service';
import { ProfileClient } from './domain/entities/profile-client.entity';
import { IClientRepository } from './domain/repositories/client.repository.interface';
import { TypeOrmClientRepository } from './infrastructure/persistence/typeorm-client.repository';
import { ClientProfileController } from './interfaces/controllers/client-profile.controller';

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



