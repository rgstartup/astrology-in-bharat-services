import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { SupportService } from '@/internal/support/support.service';
import { GetDisputesDto } from '../dto/get-disputes.dto';

@Injectable()
export class GetAdminDisputesUseCase {
  constructor(
    @Inject(forwardRef(() => SupportService))
    private readonly supportService: DeferredDependency<SupportService>,
  ) {}

  async execute(dto: GetDisputesDto) {
    const { status, page, limit } = dto;
    return this.supportService.getAllDisputes({ status, page, limit });
  }
}
