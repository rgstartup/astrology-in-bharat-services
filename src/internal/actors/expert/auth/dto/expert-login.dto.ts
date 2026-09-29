import { IsEmail, IsString } from 'class-validator';

export class ExpertLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
