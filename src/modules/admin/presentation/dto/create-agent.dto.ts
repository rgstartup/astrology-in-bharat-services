import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAgentDto {
  @IsNotEmpty()
  @IsString()
  better_auth_user_id: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  aadhaar_no?: string;

  @IsOptional()
  @IsString()
  pan_no?: string;

  @IsOptional()
  profile_pic?: any;

  @IsOptional()
  aadhaar_doc?: any;

  @IsOptional()
  pan_doc?: any;
}
