import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './interfaces/controllers/users.controller';
import { UsersService } from './application/services/users.service';
import { User } from './domain/entities/user.entity';
import { RolesModule } from '@/modules/role/roles.module';
import { IUserRepository } from './domain/repositories/user.repository.interface';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';

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
