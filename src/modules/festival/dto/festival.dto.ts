import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum FestivalType {
  FESTIVAL = 'festival',
  HOLIDAY = 'holiday',
  EVENT = 'event',
}

export class CreateFestivalDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsEnum(FestivalType)
  type?: FestivalType;

  @IsOptional()
  @IsString()
  image_url?: string;
}

export class UpdateFestivalDto extends PartialType(CreateFestivalDto) {}
