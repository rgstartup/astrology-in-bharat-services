import { PaginationDto } from '@/common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetLiveSessionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  override type?: string;
}
