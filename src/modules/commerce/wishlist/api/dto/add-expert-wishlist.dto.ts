import { IsString, IsNotEmpty } from 'class-validator';

export class AddExpertToWishlistDto {
  @IsNotEmpty()
  @IsString()
  expertId: string;
}
