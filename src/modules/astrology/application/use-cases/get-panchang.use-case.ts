import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';
import { GetPanchangDto } from '../../api/dto/get-panchang.dto';

@Injectable()
export class GetPanchangUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(dto: GetPanchangDto) {
    const { datetime, lat, lon, lang } = dto;
    return this.prokeralaService.getPanchang({ datetime, lat, lon, lang });
  }
}
