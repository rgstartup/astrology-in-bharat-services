import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetClientsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  declare search?: string;
}
