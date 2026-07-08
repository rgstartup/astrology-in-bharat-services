import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetKundliMatchingDto {
  @IsNotEmpty()
  @IsString()
  girl_dob!: string;

  @IsNotEmpty()
  @IsString()
  girl_lat!: string;

  @IsNotEmpty()
  @IsString()
  girl_lon!: string;

  @IsNotEmpty()
  @IsString()
  girl_tz!: string;

  @IsNotEmpty()
  @IsString()
  boy_dob!: string;

  @IsNotEmpty()
  @IsString()
  boy_lat!: string;

  @IsNotEmpty()
  @IsString()
  boy_lon!: string;

  @IsNotEmpty()
  @IsString()
  boy_tz!: string;

  @IsOptional()
  @IsString()
  ayanamsa?: string;
}
