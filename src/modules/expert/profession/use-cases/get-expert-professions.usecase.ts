import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpertProfession } from '../entities/expert-profession.entity';
import { ExpertProfessionResponseDto } from '../dto/response/profession-response.dto';
import { IExpert } from '@/common/types/access-token.payload';

@Injectable()
export class GetExpertProfessionsUseCase {
  constructor(
    @InjectRepository(ExpertProfession)
    private readonly expertProfessionRepo: Repository<ExpertProfession>,
  ) {}

  async execute(expert: IExpert): Promise<ExpertProfessionResponseDto[]> {
    const list = await this.expertProfessionRepo.find({
      where: { expert_id: expert.sub },
      relations: ['profession'],
      order: { is_primary: 'DESC', created_at: 'ASC' },
    });

    return list.map((item) => ExpertProfessionResponseDto.from(item));
  }
}
