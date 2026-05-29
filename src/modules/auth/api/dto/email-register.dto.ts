import { IsEmail, IsString, IsOptional, ValidateNested, IsNotEmpty, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

export class InitiateRegisterDto {
  @IsEmail()
  email!: string;

  @IsEnum(RoleEnum)
  @IsOptional()
  role: RoleEnum = RoleEnum.CLIENT;
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  line1!: string;

  @IsString()
  @IsOptional()
  line2?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  zipCode!: string;
}

export class BirthDetailsDto {
  @IsString()
  @IsNotEmpty()
  dateOfBirth!: string;

  @IsString()
  @IsNotEmpty()
  timeOfBirth!: string;

  @IsString()
  @IsNotEmpty()
  birthPlace!: string;
}

export class CompleteRegisterDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  maritalStatus?: string;

  @IsString()
  @IsOptional()
  occupation?: string;

  @IsString()
  @IsOptional()
  aboutMe?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BirthDetailsDto)
  birthDetails?: BirthDetailsDto;

  // Expert specific fields
  @IsString()
  @IsOptional()
  specialization?: string;

  @IsString()
  @IsOptional()
  languages?: string;

  @IsOptional()
  experience_in_years?: number;

  // Merchant specific fields
  @IsString()
  @IsOptional()
  shopName?: string;
}
