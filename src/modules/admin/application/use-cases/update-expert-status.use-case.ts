import { Injectable } from '@nestjs/common';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { UpdateExpertStatusDto } from '../../api/dto/update-expert-status.dto';

@Injectable()
export class UpdateExpertStatusUseCase {
  constructor(
    private readonly profileFacade: ExpertProfileFacade,
  ) {}

  async execute(id: string, dto: UpdateExpertStatusDto) {
    const { status, reason } = dto;
    return this.profileFacade.updateKycStatus(id, status, reason);
  }
}
