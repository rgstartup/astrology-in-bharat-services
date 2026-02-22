import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateTodoDto {
    @IsString()
    @IsNotEmpty()
    text: string;
}

export class UpdateTodoDto {
    @IsString()
    @IsOptional()
    text?: string;

    @IsBoolean()
    @IsOptional()
    completed?: boolean;
}
