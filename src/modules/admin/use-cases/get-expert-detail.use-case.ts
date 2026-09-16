import { Injectable } from '@nestjs/common';
import { ExpertProfileFacade } from '@/modules/expert/profile/profile.facade';

@Injectable()
export class GetExpertDetailUseCase {
  constructor(private readonly expertFacade: ExpertProfileFacade) {}

  async execute(id: number) {
    return this.expertFacade.getAdminExpertDetails(id);
  }
}
