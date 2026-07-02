import { IsArray, IsEnum, IsString } from 'class-validator';
import { MerchantProductStatus } from './create-merchant-product.dto';

export class BulkUpdateStatusDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsEnum(MerchantProductStatus)
  status: MerchantProductStatus;
}
