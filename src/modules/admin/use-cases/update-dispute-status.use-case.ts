import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { SupportFacade } from '@/modules/support/support.facade';
import { UpdateDisputeStatusDto } from '../dto/update-dispute-status.dto';

@Injectable()
export class UpdateDisputeStatusUseCase {
  constructor(
    @Inject(forwardRef(() => SupportFacade))
    private readonly supportFacade: SupportFacade,
  ) {}

  async execute(id: number, dto: UpdateDisputeStatusDto) {
    return this.supportFacade.updateDisputeStatus(id, {
      status: dto.status,
      notes: dto.notes,
    });
  }
}
