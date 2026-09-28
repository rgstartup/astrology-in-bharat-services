import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  quantity!: number;
}
