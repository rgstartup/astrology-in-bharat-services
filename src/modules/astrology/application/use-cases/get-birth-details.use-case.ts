import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';
import { GetBirthDetailsDto } from '../../api/dto/get-birth-details.dto';

@Injectable()
export class GetBirthDetailsUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(dto: GetBirthDetailsDto) {
    const { datetime, lat, lon, ayanamsa } = dto;
    return this.prokeralaService.getBirthDetails({
      datetime,
      lat,
      lon,
      ayanamsa,
    });
  }
}
