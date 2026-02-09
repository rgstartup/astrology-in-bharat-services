
import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { DisputeStatus } from '../../domain/entities/dispute.entity';

export class CloseDisputeDto {
    @IsNotEmpty()
    @IsString()
    feedback: string;

    @IsEnum(DisputeStatus)
    status: DisputeStatus;
}
