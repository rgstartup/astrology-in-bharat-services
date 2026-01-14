import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class AddExpertToWishlistDto {
    @IsNotEmpty()
    @IsInt()
    @IsPositive()
    expertId: number;
}
