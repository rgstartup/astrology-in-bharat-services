import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';

@Injectable()
export class GetMangalDoshaUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(params: {
    datetime: string;
    lat: string;
    lon: string;
    lang?: string;
  }) {
    return this.prokeralaService.getMangalDosha(params);
  }
}
