import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWishlistDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  productId: number;
}
