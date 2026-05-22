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
    update(
        @CurrentUser() user: User,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTodoDto,
    ) {
        return this.todosFacade.update(user.id as any, id, dto);
    }

    @Delete(':id')
    remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
        return this.todosFacade.remove(user.id as any, id);
    }
}
