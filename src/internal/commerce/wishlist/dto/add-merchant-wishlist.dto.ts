import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AddMerchantWishlistDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  merchantId: number;
}
