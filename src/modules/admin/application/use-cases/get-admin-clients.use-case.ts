import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { GetClientsDto } from '../../api/dto/get-clients.dto';

@Injectable()
export class GetAdminClientsUseCase {
  constructor(
    @Inject(forwardRef(() => UsersFacade))
    private readonly usersFacade: UsersFacade,
  ) {}

  async execute(dto: GetClientsDto) {
    const { search, page, limit } = dto;
    return this.usersFacade.findAllByRole('client', search, page, limit);
  }
}
