import type { DeferredDependency } from '../../../shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { GetClientsDto } from '../dto/get-clients.dto';

@Injectable()
export class GetAdminClientsUseCase {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: DeferredDependency<UsersService>,
  ) {}

  async execute(dto: GetClientsDto) {
    const { search, page, limit } = dto;
    return this.usersService.findAllByRole('client', search, page, limit);
  }
}
