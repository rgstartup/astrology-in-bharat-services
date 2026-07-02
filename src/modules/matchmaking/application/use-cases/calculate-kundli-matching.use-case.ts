import { Injectable } from '@nestjs/common';
import {
  ProkeralaService,
  ProkeralaPersonParam,
} from '@/external/prokerala/prokerala.service';

@Injectable()
export class CalculateKundliMatchingUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(girl: ProkeralaPersonParam, boy: ProkeralaPersonParam) {
    const result = await this.prokeralaService.getGunaMilan(girl, boy);
    return {
      success: true,
      data: result.data,
    };
  }
}
