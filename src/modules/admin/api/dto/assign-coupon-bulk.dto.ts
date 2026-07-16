import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { FilterCriteria } from '@/modules/users/application/use-cases/get-filtered-users.use-case';

export class AssignCouponBulkDto {
  @IsNotEmpty()
  @IsString()
  couponCode!: string;

  @IsNotEmpty()
  @IsObject()
  filters!: FilterCriteria;
}
