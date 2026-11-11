import { IntersectionType } from '@nestjs/mapped-types';
import { DateRangeDto } from '@/shared/dto/date-range.dto';
import { StatsPeriodDto } from '@/shared/dto/stats-period.dto';

export class GetDashboardStatsDto extends IntersectionType(
  DateRangeDto,
  StatsPeriodDto,
) {}