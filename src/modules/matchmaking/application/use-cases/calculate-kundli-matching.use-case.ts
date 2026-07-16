import { Injectable } from '@nestjs/common';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';
import { GunaMilanRequestDto } from '../../api/dto/matchmaking.dto';

@Injectable()
export class CalculateKundliMatchingUseCase {
  constructor(private readonly prokeralaService: ProkeralaService) {}

  async execute(dto: GunaMilanRequestDto) {
    const { girl, boy } = dto;
    const result = await this.prokeralaService.getGunaMilan(girl, boy);
    return {
      success: true,
      data: result.data,
    };
  }
}
