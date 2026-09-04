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
import { TodosFacade } from '../todos.facade';
import { CreateTodoDto, UpdateTodoDto } from '../dto/todo.dto';
import { ExpertJwtAuthGuard } from '@/modules/expert/auth/guards/auth.guard';
import { CurrentExpert } from '@/modules/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/common/types/access-token.payload';

@Controller({
  path: 'expert/todos',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class TodosController {
  constructor(private readonly todosFacade: TodosFacade) {}

  @Get()
  findAll(@CurrentExpert() expert: IExpert) {
    return this.todosFacade.findAll(expert.sub);
  }

  @Post()
  create(@CurrentExpert() expert: IExpert, @Body() dto: CreateTodoDto) {
    return this.todosFacade.create(expert.sub, dto);
  }

  @Patch(':id')
  async update(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTodoDto,
  ) {
    await this.todosFacade.update(expert.sub, id, dto);
    return { success: true };
  }

  @Delete(':id')
  async remove(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.todosFacade.remove(expert.sub, id);
    return { success: true };
  }
}
