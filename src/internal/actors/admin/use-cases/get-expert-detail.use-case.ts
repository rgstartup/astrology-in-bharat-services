import { Injectable } from '@nestjs/common';
import { ExpertProfileService } from '../../actors/expert/profile/profile.service';

@Injectable()
export class GetExpertDetailUseCase {
  constructor(private readonly expertService: ExpertProfileService) {}

  async execute(id: number) {
    return this.expertService.getAdminExpertDetails(id);
  }
}
