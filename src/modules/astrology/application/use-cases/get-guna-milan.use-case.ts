import { Injectable } from '@nestjs/common';
import {
  ProkeralaService,
  ProkeralaPersonParam,
} from '@/external/prokerala/prokerala.service';

@Injectable()
export class GetGunaMilanUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(
    girlParams: ProkeralaPersonParam,
    boyParams: ProkeralaPersonParam,
  ) {
    return this.prokeralaService.getGunaMilan(girlParams, boyParams);
  }
}
