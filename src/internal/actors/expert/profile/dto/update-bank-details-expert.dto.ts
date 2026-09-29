import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateBankDetailsExpertDto {
  @IsOptional()
  @IsString()
  bank_details?: string;

  @IsOptional()
  @IsBoolean()
  expert?: boolean;
}
