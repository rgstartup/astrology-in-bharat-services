import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KundliReport } from '../../infrastructure/entities/kundli-report.entity';
import { ProkeralaService } from '@/external/prokerala/prokerala.service';
import { GenerateKundliReportDto } from '../../api/dto/generate-kundli-report.dto';

export interface KundliPersonDetails {
  datetime: string;
  location: { lat: string; lon: string; tz: string };
  name?: string;
  place?: string;
}

@Injectable()
export class GenerateAndSaveKundliReportUseCase {
  constructor(
    private readonly prokeralaService: ProkeralaService,
    @InjectRepository(KundliReport)
    private readonly reportRepository: Repository<KundliReport>,
  ) {}

  async execute(clientId: string, dto: GenerateKundliReportDto) {
    const {
      girl_dob,
      girl_lat,
      girl_lon,
      girl_tz,
      girl_name,
      girl_place,
      boy_dob,
      boy_lat,
      boy_lon,
      boy_tz,
      boy_name,
      boy_place,
      ayanamsa,
    } = dto;

    const girlParams: KundliPersonDetails = {
      datetime: girl_dob,
      location: { lat: girl_lat, lon: girl_lon, tz: girl_tz },
      name: girl_name,
      place: girl_place,
    };

    const boyParams: KundliPersonDetails = {
      datetime: boy_dob,
      location: { lat: boy_lat, lon: boy_lon, tz: boy_tz },
      name: boy_name,
      place: boy_place,
    };

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
