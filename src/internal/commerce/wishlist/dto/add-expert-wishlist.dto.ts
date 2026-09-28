import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AddExpertToWishlistDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  expert_id: number;
}
