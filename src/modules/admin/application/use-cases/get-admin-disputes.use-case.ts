import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { SupportFacade } from '@/modules/support/application/support.facade';
import { GetDisputesDto } from '../../api/dto/get-disputes.dto';

@Injectable()
export class GetAdminDisputesUseCase {
  constructor(
    @Inject(forwardRef(() => SupportFacade))
    private readonly supportFacade: SupportFacade,
  ) {}

  async execute(dto: GetDisputesDto) {
    const { status, page, limit } = dto;
    return this.supportFacade.getAllDisputes({ status, page, limit });
  }
}
