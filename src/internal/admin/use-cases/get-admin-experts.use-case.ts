import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '@/internal/users/users.service';
import { GetExpertsDto } from '../dto/get-experts.dto';

@Injectable()
export class GetAdminExpertsUseCase {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async execute(dto: GetExpertsDto) {
    const { search, status, page, limit } = dto;
    return this.usersService.findAllByRole(
      'expert',
      search,
      page,
      limit,
      status,
    );
  }
}
