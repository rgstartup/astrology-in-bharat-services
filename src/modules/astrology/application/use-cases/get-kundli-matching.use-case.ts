import { Injectable } from '@nestjs/common';
import { ProkeralaService, ProkeralaPersonParam } from '@/external/prokerala/prokerala.service';
import { GetKundliMatchingDto } from '../../api/dto/get-kundli-matching.dto';

@Injectable()
export class GetKundliMatchingUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(dto: GetKundliMatchingDto) {
    const {
      girl_dob,
      girl_lat,
      girl_lon,
      girl_tz,
      boy_dob,
      boy_lat,
      boy_lon,
      boy_tz,
      ayanamsa,
    } = dto;

    const girlParams: ProkeralaPersonParam = {
      datetime: girl_dob,
      location: { lat: girl_lat, lon: girl_lon, tz: girl_tz },
    };

    const boyParams: ProkeralaPersonParam = {
      datetime: boy_dob,
      location: { lat: boy_lat, lon: boy_lon, tz: boy_tz },
    };

    return this.prokeralaService.getKundliMatching(
      girlParams,
      boyParams,
      ayanamsa,
    );
  }
}
