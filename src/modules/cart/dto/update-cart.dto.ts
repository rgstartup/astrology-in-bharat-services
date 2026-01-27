import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class UpdateCartItemDto {
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  productId: number;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  quantity: number;
}
