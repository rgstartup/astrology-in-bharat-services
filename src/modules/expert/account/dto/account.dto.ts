import { PartialType } from '@nestjs/mapped-types';
import { CreateProfileExpertDto } from '../../profile/api/dto/profile-expert.dto';
import { IsOptional, IsString } from 'class-validator';

export class ExpertAccountDto extends CreateProfileExpertDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  about_me?: string;
}

export class CreateExpertAccountDto extends ExpertAccountDto {}

export class UpdateExpertAccountDto extends PartialType(ExpertAccountDto) {}
