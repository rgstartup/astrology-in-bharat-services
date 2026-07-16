import { PaginationDto } from '@/common/dto/pagination.dto';
import { DisputeStatus } from '@/modules/support/infrastructure/entities/dispute.entity';
import { IsEnum, IsOptional } from 'class-validator';

export class GetDisputesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  override status?: DisputeStatus;
}
