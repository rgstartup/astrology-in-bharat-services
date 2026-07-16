import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UpdateSupportSettingsDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  phone!: string;

  @IsNotEmpty()
  @IsString()
  whatsapp!: string;
}
