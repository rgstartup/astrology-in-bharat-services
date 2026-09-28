import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KundliReport } from '../entities/kundli-report.entity';

@Injectable()
export class GetMyKundliReportsUseCase {
  constructor(
    @InjectRepository(KundliReport)
    private readonly reportRepository: Repository<KundliReport>,
  ) {}

  async execute(clientId: number | string) {
    const reports = await this.reportRepository.find({
      where: { client_id: Number(clientId) },
      order: { created_at: 'DESC' },
    });

    return {
      success: true,
      data: reports,
    };
  }
}
