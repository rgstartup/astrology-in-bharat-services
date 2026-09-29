import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePortfolioExpertDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsOptional()
  @IsString()
  video?: string;

  @IsOptional()
  @IsBoolean()
  expert?: boolean;
}
