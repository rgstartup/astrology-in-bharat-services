import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateCertificatesExpertDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificates?: string[];

  @IsOptional()
  @IsBoolean()
  expert?: boolean;
}
