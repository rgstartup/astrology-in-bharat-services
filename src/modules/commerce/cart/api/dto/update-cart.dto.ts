import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class UpdateCartItemDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  quantity: number;
}
