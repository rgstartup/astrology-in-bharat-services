import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './application/services/roles.service';
import { Role } from './domain/entities/roles.entity';
import { IRoleRepository } from './domain/repositories/role.repository.interface';
import { TypeOrmRoleRepository } from './infrastructure/persistence/typeorm-role.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [
    RolesService,
    {
      provide: IRoleRepository,
      useClass: TypeOrmRoleRepository,
    },
  ],
  exports: [RolesService],
})
export class RolesModule { }
