import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { User } from '@/modules/users/domain/entities/user.entity';
import { CreateTodoDto, UpdateTodoDto } from '../../application/dtos/todo.dto';
import { TodosService } from '../../application/services/todos.service';

@Controller({
    path: 'expert/todos',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class TodosController {
    constructor(private readonly todosService: TodosService) { }

    @Get()
    findAll(@CurrentUser() user: User) {
        return this.todosService.findAll(user);
    }

    @Post()
    create(@CurrentUser() user: User, @Body() dto: CreateTodoDto) {
        return this.todosService.create(user, dto);
    }

    @Patch(':id')
    update(
        @CurrentUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTodoDto,
    ) {
        return this.todosService.update(user, id, dto);
    }

    @Delete(':id')
    remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
        return this.todosService.remove(user, id);
    }
}

