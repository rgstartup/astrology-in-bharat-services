import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { SortDto } from '@/shared/sorting/sort.dto';
import { IntersectionType } from '@nestjs/mapped-types';

export const NOTIFICATION_SORT_FIELDS = [
  'id',
  'created_at',
  'is_read',
  'title',
  'type',
] as const;

const NotificationSortDto = SortDto(NOTIFICATION_SORT_FIELDS);

export class GetNotificationsDto extends IntersectionType(
  PaginationDto,
  NotificationSortDto,
) {}
