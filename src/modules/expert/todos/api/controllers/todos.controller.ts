import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { TodosFacade } from '../../application/todos.facade';
import { CreateTodoDto, UpdateTodoDto } from '../../infrastructure/dto/todo.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Controller({
    path: 'expert/todos',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class TodosController {
    constructor(private readonly todosFacade: TodosFacade) { }

    @Get()
    findAll(@CurrentUser() user: User) {
        return this.todosFacade.findAll(user.id as any);
    }

    @Post()
    create(@CurrentUser() user: User, @Body() dto: CreateTodoDto) {
        return this.todosFacade.create(user.id as any, dto);
    }

    @Patch(':id')
    async update(
        @CurrentUser() user: User,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTodoDto,
    ) {
        const result = await this.todosFacade.update(user.id as any, id, dto);
        return { success: true };
    }

    @Delete(':id')
    async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
        const result = await this.todosFacade.remove(user.id as any, id);
        if (result && result.success && 'data' in result) {
            const { data, ...rest } = result as any;
            return rest;
        }
        return result;
    }
}
