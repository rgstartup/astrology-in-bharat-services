import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  account_holder_name: string;

  @IsString()
  @IsNotEmpty()
  bank_name: string;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @IsString()
  @IsNotEmpty()
  ifsc_code: string;

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
  id?: any;

  @IsOptional()
  expert_id?: any;

  @IsOptional()
  created_at?: any;

  @IsOptional()
  updated_at?: any;

  @IsOptional()
  razorpay_fund_account_id?: any;
}
