import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KundliReport } from '../entities/kundli-report.entity';

@Injectable()
export class DeleteKundliReportUseCase {
  constructor(
    @InjectRepository(KundliReport)
    private readonly kundliReportRepository: Repository<KundliReport>,
  ) {}

  async execute(clientId: number | string, reportId: number | string) {
    const report = await this.kundliReportRepository.findOne({
      where: { id: Number(reportId) },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.client_id !== Number(clientId)) {
      throw new ForbiddenException(
        'You do not have permission to delete this report',
      );
    }

    await this.kundliReportRepository.remove(report);
    return { success: true, message: 'Report deleted successfully' };
  }
}
