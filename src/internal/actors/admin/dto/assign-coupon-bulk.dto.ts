import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { type FilterCriteria } from '@/internal/users/use-cases/get-filtered-users.use-case';

export class AssignCouponBulkDto {
  @IsNotEmpty()
  @IsString()
  couponCode!: string;

  @IsNotEmpty()
  @IsObject()
  filters!: FilterCriteria;
}
