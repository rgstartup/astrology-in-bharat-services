import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetDailyHoroscopeDto {
  @IsNotEmpty()
  @IsString()
  sign!: string;

  @IsOptional()
  @IsString()
  lang?: string;
}
