import { PaginationDto } from '@/shared/dto/pagination.dto';
import { SortDto } from '@/shared/sorting/sort.dto';
import { IntersectionType } from '@nestjs/mapped-types';

export const EXPERT_NOTIFICATION_SORT_FIELDS = [
  'id',
  'created_at',
  'is_read',
  'title',
  'type',
] as const;

const ExpertNotificationSortDto = SortDto(EXPERT_NOTIFICATION_SORT_FIELDS);

export class GetExpertNotificationsDto extends IntersectionType(
  PaginationDto,
  ExpertNotificationSortDto,
) {}
