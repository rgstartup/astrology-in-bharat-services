import { IsString, IsNotEmpty, Length } from 'class-validator';

export class SendPhoneOtpDto {
    @IsString()
    @IsNotEmpty()
    phone: string;
}

export class VerifyPhoneOtpDto {
    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    code: string;
}
