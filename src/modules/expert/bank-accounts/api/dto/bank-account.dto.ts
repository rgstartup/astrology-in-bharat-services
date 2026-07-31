import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  account_holder_name!: string;

  @IsString()
  @IsNotEmpty()
  bank_name!: string;

  @IsString()
  @IsNotEmpty()
  account_number!: string;

  @IsString()
  @IsNotEmpty()
  ifsc_code!: string;

  @IsString()
  @IsOptional()
  upi_id?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}

export class UpdateBankAccountDto {
  @IsString()
  @IsOptional()
  account_holder_name?: string;

  @IsString()
  @IsOptional()
  bank_name?: string;

  @IsString()
  @IsOptional()
  account_number?: string;

  @IsString()
  @IsOptional()
  ifsc_code?: string;

  @IsString()
  @IsOptional()
  upi_id?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;

  // Allow metadata fields from frontend to pass validation
  @IsOptional()
  id?: string;

  @IsOptional()
  expert_id?: string;

  @IsOptional()
  created_at?: Date | string;

  @IsOptional()
  updated_at?: Date | string;

  @IsOptional()
  razorpay_fund_account_id?: string;
}
