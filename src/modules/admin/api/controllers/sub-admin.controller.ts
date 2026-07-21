// src/modules/admin/api/controllers/sub-admin.controller.ts
// Ye controller sirf SUPER_ADMIN ke liye accessible hai.
// Sub-admin CREATE kar sakta hai, list dekh sakta hai, permissions update kar sakta hai, aur delete kar sakta hai.

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IUser } from '@/common/types/access-token.payload';
import { CreateSubAdminDto } from '../dto/create-sub-admin.dto';
import { UpdateSubAdminDto } from '../dto/update-sub-admin.dto';
import { CreateSubAdminUseCase } from '../../application/use-cases/create-sub-admin.use-case';
import { GetSubAdminsUseCase } from '../../application/use-cases/get-sub-admins.use-case';
import { UpdateSubAdminUseCase } from '../../application/use-cases/update-sub-admin.use-case';
import { DeleteSubAdminUseCase } from '../../application/use-cases/delete-sub-admin.use-case';

@Controller({ path: 'admin/sub-admins', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
// Sirf SUPER_ADMIN ya ADMIN hi sub-admins manage kar sakta hai
@Roles('SUPER_ADMIN', 'ADMIN')
export class SubAdminController {
  constructor(
    private readonly createSubAdminUseCase: CreateSubAdminUseCase,
    private readonly getSubAdminsUseCase: GetSubAdminsUseCase,
    private readonly updateSubAdminUseCase: UpdateSubAdminUseCase,
    private readonly deleteSubAdminUseCase: DeleteSubAdminUseCase,
  ) {}

  // Sab sub-admins ki list
  @Get()
  async getSubAdmins() {
    return this.getSubAdminsUseCase.execute();
  }

  // Naya sub-admin banao
  @Post()
  async createSubAdmin(
    @Body() dto: CreateSubAdminDto,
    @CurrentUser() admin: IUser,
  ) {
    return this.createSubAdminUseCase.execute({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      permissions: dto.permissions,
      createdByAdminId: admin.id,
    });
  }

  // Sub-admin ki permissions/details update karo
  @Put(':id')
  async updateSubAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubAdminDto,
    @CurrentUser() admin: IUser,
  ) {
    return this.updateSubAdminUseCase.execute({
      targetId: id,
      permissions: dto.permissions,
      name: dto.name,
      password: dto.password,
      updatedByAdminId: admin.id,
    });
  }

  // Sub-admin delete karo
  @Delete(':id')
  async deleteSubAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: IUser,
  ) {
    return this.deleteSubAdminUseCase.execute(id, admin.id);
  }
}
