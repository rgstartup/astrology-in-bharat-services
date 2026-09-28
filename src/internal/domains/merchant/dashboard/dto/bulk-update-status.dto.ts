import { IsArray, IsEnum, IsNumber } from 'class-validator';
import { MerchantProductStatus } from '../enum';

export class BulkUpdateStatusDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];

  @IsEnum(MerchantProductStatus)
  status: MerchantProductStatus;
}
