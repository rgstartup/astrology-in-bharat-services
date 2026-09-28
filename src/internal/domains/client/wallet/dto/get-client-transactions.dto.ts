import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '@/shared/dto/pagination.dto';
import { ClientTransactionPurpose, ClientTransactionType } from '../enum';

export class GetClientTransactionsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ClientTransactionType)
  type?: ClientTransactionType;

  @IsOptional()
  @IsEnum(ClientTransactionPurpose)
  purpose?: ClientTransactionPurpose;
}
