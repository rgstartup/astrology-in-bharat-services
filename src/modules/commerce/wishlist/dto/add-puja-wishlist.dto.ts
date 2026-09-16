import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AddPujaToWishlistDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  pujaId: number;
}
