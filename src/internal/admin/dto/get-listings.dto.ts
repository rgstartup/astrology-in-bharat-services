import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetAdminListingsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  declare type?: string;

  @IsOptional()
  @IsString()
  declare search?: string;
}
