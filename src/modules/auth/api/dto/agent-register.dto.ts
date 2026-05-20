import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class AgentRegisterUserDto {
    @IsEmail()
    email!: string;

    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsArray()
    @IsEnum(RoleEnum, { each: true})
    roles: RoleEnum[] = [RoleEnum.CLIENT];
}
