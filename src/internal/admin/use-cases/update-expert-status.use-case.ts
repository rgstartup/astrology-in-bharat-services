import { Injectable } from '@nestjs/common';
import { ExpertProfileService } from '@/internal/domains/expert/profile/profile.service';
import { UpdateExpertStatusDto } from '../dto/update-expert-status.dto';

@Injectable()
export class UpdateExpertStatusUseCase {
  constructor(private readonly profileService: ExpertProfileService) {}

  async execute(id: number, dto: UpdateExpertStatusDto) {
    const { status, reason } = dto;
    return this.profileService.updateKycStatus(id, status, reason);
  }
}
