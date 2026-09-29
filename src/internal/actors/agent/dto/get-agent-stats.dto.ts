import { DateRangeDto } from '../../../../shared/dto/date-range.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetAgentStatsDto extends DateRangeDto {
  @IsOptional()
  @IsString()
  range?: string = '30d';
}
