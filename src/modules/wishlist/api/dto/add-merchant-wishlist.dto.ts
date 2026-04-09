import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class AddMerchantWishlistDto {
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  merchantId: number;
}
