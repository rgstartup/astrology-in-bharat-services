import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { GetExpertsDto } from '../../api/dto/get-experts.dto';

@Injectable()
export class GetAdminExpertsUseCase {
  constructor(
    @Inject(forwardRef(() => UsersFacade))
    private readonly usersFacade: UsersFacade,
  ) {}

  async execute(dto: GetExpertsDto) {
    const { search, status, page, limit } = dto;
    return this.usersFacade.findAllByRole('expert', search, page, limit, status);
  }
}
