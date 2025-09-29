import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateExpertDto {
  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: "Experience can't be negative" })
  experience_years?: number;
}
