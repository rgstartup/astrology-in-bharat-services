import { ValidateIf } from 'class-validator';
import { IsAfter, IsTimestampTz } from '../decorators/time.decorator';

export class DateRangeDto {
  @ValidateIf((o: DateRangeDto) => !!o.endDate)
  @IsTimestampTz()
  startDate?: string;

  @ValidateIf((o: DateRangeDto) => !!o.startDate)
  @IsTimestampTz()
  @IsAfter('startDate')
  endDate?: string;
}
