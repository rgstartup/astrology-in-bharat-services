import { PaginationDto } from '@/shared/dto/pagination.dto';
import { DisputeStatus } from '@/internal/support/entities/dispute.entity';
import { IsEnum, IsOptional } from 'class-validator';

export class GetDisputesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  override status?: DisputeStatus;
}
