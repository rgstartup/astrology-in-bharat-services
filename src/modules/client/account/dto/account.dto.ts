import { AddressDto } from '@/common/address/address.dto';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class ClientPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  topics?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  specializations?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  professions?: number[];

  @IsOptional()
  @IsEnum(['chat', 'call', 'both'])
  communication_channel?: 'chat' | 'call' | 'both';

  @IsOptional()
  @IsBoolean()
  receive_daily_panchang?: boolean;
}

export class ClientAccountDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  time_of_birth?: string;

  @IsOptional()
  @IsString()
  place_of_birth?: string;

  @IsEnum(['male', 'female', 'other'])
  @IsOptional()
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  marital_status?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  about_me?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClientPreferencesDto)
  preferences?: ClientPreferencesDto;

  @IsOptional()
  @IsString()
  language_preference?: string;

  /**
   * @deprecated Use `avatar_id` instead to link to the Media entity.
   */
  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  avatar_id?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];
}

export class CreateClientAccountDto extends ClientAccountDto {}

export class UpdateClientAccountDto extends PartialType(ClientAccountDto) {}
