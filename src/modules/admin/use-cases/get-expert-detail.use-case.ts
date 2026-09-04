import { Injectable } from '@nestjs/common';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';

@Injectable()
export class GetExpertDetailUseCase {
  constructor(private readonly expertFacade: ExpertProfileFacade) {}

  async execute(id: string) {
    return this.expertFacade.getAdminExpertDetails(id);
  }
}
