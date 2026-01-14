import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CreateWishlistDto {
    @IsNotEmpty()
    @IsInt()
    @IsPositive()
    productId: number;
}
