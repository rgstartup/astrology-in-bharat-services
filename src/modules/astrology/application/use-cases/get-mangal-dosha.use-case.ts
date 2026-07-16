import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';
import { GetMangalDoshaDto } from '../../api/dto/get-mangal-dosha.dto';

@Injectable()
export class GetMangalDoshaUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(dto: GetMangalDoshaDto) {
    const { datetime, lat, lon, lang } = dto;
    return this.prokeralaService.getMangalDosha({ datetime, lat, lon, lang });
  }
}
