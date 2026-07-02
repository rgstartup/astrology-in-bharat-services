import { Injectable } from '@nestjs/common';
import {
  ProkeralaService,
  ProkeralaPersonParam,
} from '@/external/prokerala/prokerala.service';

@Injectable()
export class GetKundliMatchingUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(
    girlParams: ProkeralaPersonParam,
    boyParams: ProkeralaPersonParam,
    ayanamsa?: string,
  ) {
    return this.prokeralaService.getKundliMatching(
      girlParams,
      boyParams,
      ayanamsa,
    );
  }
}
