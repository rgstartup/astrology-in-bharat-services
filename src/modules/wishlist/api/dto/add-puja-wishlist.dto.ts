import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class AddPujaToWishlistDto {
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  pujaId: number;
}
