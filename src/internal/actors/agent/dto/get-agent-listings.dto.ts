import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetAgentListingsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  declare type?: string;

  @IsOptional()
  @IsString()
  declare search?: string;
}
