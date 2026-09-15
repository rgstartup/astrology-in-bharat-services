import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource } from 'typeorm';
import { Profession } from '../entities/profession.entity';
import { ExpertProfession } from '../entities/expert-profession.entity';
import { SyncExpertProfessionsDto } from '../dto/request/profession.dto';
import { ExpertProfessionResponseDto } from '../dto/response/profession-response.dto';
import { IExpert } from '@/common/types/access-token.payload';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';

@Injectable()
export class SyncExpertProfessionsUseCase {
  constructor(
    @InjectRepository(Profession)
    private readonly professionRepo: Repository<Profession>,
    @InjectRepository(ExpertProfession)
    private readonly expertProfessionRepo: Repository<ExpertProfession>,
    @InjectRepository(ExpertAccount)
    private readonly expertAccountRepo: Repository<ExpertAccount>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    expert: IExpert,
    dto: SyncExpertProfessionsDto,
  ): Promise<ExpertProfessionResponseDto[]> {
    const expertAccount = await this.expertAccountRepo.findOne({
      where: { id: expert.sub },
    });

    if (!expertAccount) {
      throw new NotFoundException('Expert account not found');
    }

    if (!dto.profession_ids || dto.profession_ids.length === 0) {
      throw new BadRequestException('At least one profession must be selected');
    }

    const uniqueProfessionIds = Array.from(new Set(dto.profession_ids));

    // Verify all requested professions exist and are active
    const validProfessions = await this.professionRepo.find({
      where: {
        id: In(uniqueProfessionIds),
        is_active: true,
      },
    });

    if (validProfessions.length !== uniqueProfessionIds.length) {
      throw new BadRequestException(
        'One or more selected professions are invalid or inactive',
      );
    }

    const primaryId =
      dto.primary_profession_id &&
      uniqueProfessionIds.includes(dto.primary_profession_id)
        ? dto.primary_profession_id
        : uniqueProfessionIds[0];

    await this.dataSource.transaction(async (manager) => {
      // Delete existing associations
      await manager.delete(ExpertProfession, { expert_id: expert.sub });

      // Create new associations
      const newAssociations = uniqueProfessionIds.map((profId) => {
        return manager.create(ExpertProfession, {
          expert_id: expert.sub,
          profession_id: profId,
          is_primary: profId === primaryId,
        });
      });

      await manager.save(ExpertProfession, newAssociations);
    });

    // Return the updated list
    const updated = await this.expertProfessionRepo.find({
      where: { expert_id: expert.sub },
      relations: ['profession'],
      order: { is_primary: 'DESC', created_at: 'ASC' },
    });

    return updated.map((item) => ExpertProfessionResponseDto.from(item));
  }
}
