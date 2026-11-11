import { IntersectionType } from '@nestjs/mapped-types';
import { DateRangeDto } from '@/shared/dto/date-range.dto';
import { PaginationDto } from '@/shared/dto/pagination.dto';

export class GetExpertReviewsByDateDto extends IntersectionType(
  PaginationDto,
  DateRangeDto,
) {}
