import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateKundliReportDto {
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
  girl_name!: string;

  @IsNotEmpty()
  @IsString()
  girl_place!: string;

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

  @IsNotEmpty()
  @IsString()
  boy_name!: string;

  @IsNotEmpty()
  @IsString()
  boy_place!: string;

  @IsOptional()
  @IsString()
  ayanamsa?: string;
}
