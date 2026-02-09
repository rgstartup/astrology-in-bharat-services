
import { IsString, IsOptional } from 'class-validator';

export class RequestCloseDisputeDto {
    @IsOptional()
    @IsString()
    reason?: string;
}
