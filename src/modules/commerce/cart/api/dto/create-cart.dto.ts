import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  productId: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  quantity: number;
}
