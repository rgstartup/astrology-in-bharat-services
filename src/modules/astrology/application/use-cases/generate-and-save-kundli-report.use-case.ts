import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KundliReport } from '../../infrastructure/entities/kundli-report.entity';
import { ProkeralaService, ProkeralaPersonParam } from '@/external/prokerala/prokerala.service';

@Injectable()
export class GenerateAndSaveKundliReportUseCase {
  constructor(
    private readonly prokeralaService: ProkeralaService,
    @InjectRepository(KundliReport)
    private readonly reportRepository: Repository<KundliReport>,
  ) {}

  async execute(
    clientId: string,
    girlParams: ProkeralaPersonParam,
    boyParams: ProkeralaPersonParam,
    ayanamsa?: string,
  ) {
    // 1. Fetch matching result from Prokerala
    const result = await this.prokeralaService.getKundliMatching(
      girlParams,
      boyParams,
      ayanamsa,
    );

    if (!result) {
      throw new InternalServerErrorException('Failed to generate Kundli Matching report.');
    }

    // 2. Save to database
    const report = this.reportRepository.create({
      client_id: clientId,
      boy_details: boyParams,
      girl_details: girlParams,
      match_result: result,
    });

    await this.reportRepository.save(report);

    return result;
  }
}
