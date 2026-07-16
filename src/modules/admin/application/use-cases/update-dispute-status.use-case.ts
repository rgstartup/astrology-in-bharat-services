import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { SupportFacade } from '@/modules/support/application/support.facade';
import { UpdateDisputeStatusDto } from '../../api/dto/update-dispute-status.dto';

@Injectable()
export class UpdateDisputeStatusUseCase {
  constructor(
    @Inject(forwardRef(() => SupportFacade))
    private readonly supportFacade: SupportFacade,
  ) {}

  async execute(id: string, dto: UpdateDisputeStatusDto) {
    const { status, notes } = dto;
    return this.supportFacade.updateDisputeStatus(id, { status, notes });
  }
}
