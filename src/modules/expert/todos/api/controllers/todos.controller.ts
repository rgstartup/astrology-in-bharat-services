import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { TodosFacade } from '../../application/todos.facade';
import { CreateTodoDto, UpdateTodoDto } from '../../infrastructure/persistence/dto/todo.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

@Controller({
    path: 'expert/todos',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class TodosController {
    constructor(private readonly todosFacade: TodosFacade) { }

    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.todosFacade.findAll(user.id);
    }

    @Post()
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTodoDto) {
        return this.todosFacade.create(user.id, dto);
    }

    @Patch(':id')
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTodoDto,
    ) {
        return this.todosFacade.update(user.id, id, dto);
    }

    @Delete(':id')
    remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
        return this.todosFacade.remove(user.id, id);
    }
}
