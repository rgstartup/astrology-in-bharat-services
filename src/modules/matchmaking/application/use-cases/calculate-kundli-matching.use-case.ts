import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';

@Injectable()
export class CalculateKundliMatchingUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(girl: any, boy: any) {
    const result = await this.prokeralaService.getGunaMilan(girl, boy);
    return {
      success: true,
      data: result.data,
    };
  }
}
