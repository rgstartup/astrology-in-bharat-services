import { IsOptional, IsString } from 'class-validator';

export class CreateProfileAdminDto {
    @IsOptional()
    @IsString()
    department?: string;

    @IsOptional()
    @IsString()
    level?: string;
}

export class UpdateProfileAdminDto extends CreateProfileAdminDto { }
