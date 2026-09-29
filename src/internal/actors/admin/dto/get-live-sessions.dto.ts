import { PaginationDto } from '@/shared/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetLiveSessionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  declare type?: string;
}
