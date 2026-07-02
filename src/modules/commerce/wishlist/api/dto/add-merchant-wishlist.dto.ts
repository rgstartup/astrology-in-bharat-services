import { IsString, IsNotEmpty } from 'class-validator';

export class AddMerchantWishlistDto {
  @IsNotEmpty()
  @IsString()
  merchantId: string;
}
