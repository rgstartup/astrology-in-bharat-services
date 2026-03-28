import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum PujaType {
  Online = 'online',
  HomeVisit = 'home_visit',
}

export class SamagriItemDto {
  @IsString()
  name: string;

  @IsString()
  quantity: string;
}

export class ExpertPujaDto {
  @IsEnum(PujaType)
  type: PujaType;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  duration_hours: number;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  districts?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SamagriItemDto)
  samagri_list?: SamagriItemDto[];
}
