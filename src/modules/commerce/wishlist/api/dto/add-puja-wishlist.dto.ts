import { IsString, IsNotEmpty } from 'class-validator';

export class AddPujaToWishlistDto {
  @IsNotEmpty()
  @IsString()
  pujaId: string;
}
