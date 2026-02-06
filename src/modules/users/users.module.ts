import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesModule } from '@/modules/role/roles.module';
import { UsersService } from './application/services/users.service';
import { User } from './domain/entities/user.entity';
import { IUserRepository } from './domain/repositories/user.repository.interface';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';
import { UsersController } from './interfaces/controllers/users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RolesModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: IUserRepository,
      useClass: TypeOrmUserRepository,
    },
  ],
  exports: [UsersService, IUserRepository],
})
export class UsersModule { }
