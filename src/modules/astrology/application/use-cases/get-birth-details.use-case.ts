import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';

@Injectable()
export class GetBirthDetailsUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(params: {
    datetime: string;
    lat: string;
    lon: string;
    ayanamsa?: string;
  }) {
    return this.prokeralaService.getBirthDetails(params);
  }
}
