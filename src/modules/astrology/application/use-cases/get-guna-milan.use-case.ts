import { Injectable } from '@nestjs/common';
import { ProkeralaService, ProkeralaPersonParam } from '@/external/prokerala/prokerala.service';
import { GetGunaMilanDto } from '../../api/dto/get-guna-milan.dto';

@Injectable()
export class GetGunaMilanUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(dto: GetGunaMilanDto) {
    const {
      girl_dob,
      girl_lat,
      girl_lon,
      girl_tz,
      boy_dob,
      boy_lat,
      boy_lon,
      boy_tz,
    } = dto;

    const girlParams: ProkeralaPersonParam = {
      datetime: girl_dob,
      location: { lat: girl_lat, lon: girl_lon, tz: girl_tz },
    };

    const boyParams: ProkeralaPersonParam = {
      datetime: boy_dob,
      location: { lat: boy_lat, lon: boy_lon, tz: boy_tz },
    };

    return this.prokeralaService.getGunaMilan(girlParams, boyParams);
  }
}
