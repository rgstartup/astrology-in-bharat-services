import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configs from '@/config';
import { DatabaseModule } from '@/core/database/database.module';
import { IHasherToken } from '@/common/contracts/hasher.contract';
import { Argon2PasswordHasher } from '@/modules/auth/infrastructure/hashing/argon2-password.hasher';

// Entities
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { SystemSetting } from '@/modules/admin/entities/system-setting.entity';
import { ConsultationTopic } from '@/modules/consultation/consultation/entities/consultation_topic.entity';

// Seeders
import { AdminSeeder } from './seeders/admin.seeder';
import { SystemSettingSeeder } from './seeders/system-setting.seeder';
import { ConsultationTopicSeeder } from './seeders/consultation-topic.seeder';
import { SeederService } from './seeder.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: configs,
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([User, SystemSetting, ConsultationTopic]),
  ],
  providers: [
    {
      provide: IHasherToken,
      useClass: Argon2PasswordHasher,
    },
    AdminSeeder,
    SystemSettingSeeder,
    ConsultationTopicSeeder,
    SeederService,
  ],
  exports: [SeederService],
})
export class SeederModule {}
