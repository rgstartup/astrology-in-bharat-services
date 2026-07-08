import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';
import { GetPlanetaryPositionsDto } from '../../api/dto/get-planetary-positions.dto';

@Injectable()
export class GetPlanetaryPositionsUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(dto: GetPlanetaryPositionsDto) {
    const { datetime, lat, lon, lang } = dto;
    return this.prokeralaService.getPlanetaryPositions({ datetime, lat, lon, lang });
  }
}
