import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateExpertStatusDto {
  @IsNotEmpty()
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
