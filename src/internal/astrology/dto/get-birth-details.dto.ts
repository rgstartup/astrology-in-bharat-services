import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetBirthDetailsDto {
  @IsNotEmpty()
  @IsString()
  datetime!: string;

  @IsNotEmpty()
  @IsString()
  lat!: string;

  @IsNotEmpty()
  @IsString()
  lon!: string;

  @IsOptional()
  @IsString()
  ayanamsa?: string;
}
