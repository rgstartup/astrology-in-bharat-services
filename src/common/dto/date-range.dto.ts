import { ValidateIf } from 'class-validator';
import { IsAfter, IsTimestampTz } from '../decorators/time.decorator';

export class DateRangeDto {
  @ValidateIf(o => !!o.endDate)
  @IsTimestampTz()
  startDate?: string;

  @ValidateIf(o => !!o.startDate)
  @IsTimestampTz()
  @IsAfter('startDate')
  endDate?: string;
}