import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSystemSettingDto {
  @IsNotEmpty()
  @IsString()
  key!: string;

  @IsNotEmpty()
  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
