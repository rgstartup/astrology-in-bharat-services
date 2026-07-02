import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';

@Injectable()
export class GetDailyHoroscopeUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(sign: string, lang?: string) {
    return this.prokeralaService.getDailyHoroscope(sign, lang);
  }
}
