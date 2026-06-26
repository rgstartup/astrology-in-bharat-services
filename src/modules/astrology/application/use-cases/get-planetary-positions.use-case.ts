import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';

@Injectable()
export class GetPlanetaryPositionsUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(params: {
    datetime: string;
    lat: string;
    lon: string;
    lang?: string;
  }) {
    return this.prokeralaService.getPlanetaryPositions(params);
  }
}
