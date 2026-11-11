import { IntersectionType } from '@nestjs/mapped-types';
import { DateRangeDto } from '@/shared/dto/date-range.dto';
import { PaginationDto } from '@/shared/dto/pagination.dto';

export class GetExpertReviewsDto extends IntersectionType(
  PaginationDto,
  DateRangeDto,
) {}
