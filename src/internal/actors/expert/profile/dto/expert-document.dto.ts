import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ExpertDocumentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  category?: 'aadhar' | 'pan' | 'other';

  @IsOptional()
  @IsString()
  side?: 'front' | 'back';

  @IsOptional()
  size?: number | string;

  @IsOptional()
  uploadedAt?: string | Date;
}

export class UpdateDocumentsExpertDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpertDocumentDto)
  documents?: ExpertDocumentDto[];

  @IsOptional()
  @IsBoolean()
  expert?: boolean;
}
