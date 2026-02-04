import { IsString, IsNotEmpty } from 'class-validator';

export class AssignCouponDto {
    @IsString()
    @IsNotEmpty()
    code: string;
}
