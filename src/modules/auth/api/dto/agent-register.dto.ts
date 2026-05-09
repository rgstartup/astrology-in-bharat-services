import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

export class AgentRegisterUserDto {
    @IsEmail()
    email!: string;

    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsArray()
    @IsString({ each: true })
    roles: string[] = ['client'];
}
