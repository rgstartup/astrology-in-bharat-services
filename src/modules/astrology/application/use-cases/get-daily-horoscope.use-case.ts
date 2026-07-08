import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';
import { GetDailyHoroscopeDto } from '../../api/dto/get-daily-horoscope.dto';

@Injectable()
export class GetDailyHoroscopeUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(dto: GetDailyHoroscopeDto) {
    const { sign, lang } = dto;
    return this.prokeralaService.getDailyHoroscope(sign, lang);
  }
}
