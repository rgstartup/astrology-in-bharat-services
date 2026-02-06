import { IsEmail, IsString, IsOptional } from 'class-validator';

export class SupportSettingsDto {
    @IsEmail()
    email: string;

    @IsString()
    phone: string;

    @IsString()
    whatsapp: string;
}
