import { IsArray, IsEnum, IsNumber, IsString } from 'class-validator';
import { MerchantProductStatus } from './create-merchant-product.dto';

export class BulkUpdateStatusDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];

  @IsEnum(MerchantProductStatus)
  status: MerchantProductStatus;
}
