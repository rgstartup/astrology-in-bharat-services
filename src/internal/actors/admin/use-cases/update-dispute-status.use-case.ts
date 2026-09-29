import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { SupportService } from '@/internal/support/support.service';
import { UpdateDisputeStatusDto } from '../dto/update-dispute-status.dto';

@Injectable()
export class UpdateDisputeStatusUseCase {
  constructor(
    @Inject(forwardRef(() => SupportService))
    private readonly supportService: DeferredDependency<SupportService>,
  ) {}

  async execute(id: number, dto: UpdateDisputeStatusDto) {
    return this.supportService.updateDisputeStatus(id, {
      status: dto.status,
      notes: dto.notes,
    });
  }
}
