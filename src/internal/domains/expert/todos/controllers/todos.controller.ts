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
import { TodosService } from '../todos.service';
import { CreateTodoDto, UpdateTodoDto } from '../dto/todo.dto';
import { ExpertJwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentExpert } from '../../auth/decorators/current-expert.decorator';
import { type IExpert } from '../../../../../shared/types/access-token.payload';

@Controller({
  path: 'expert/todos',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  findAll(@CurrentExpert() expert: IExpert) {
    return this.todosService.findAll(expert.sub);
  }

  @Post()
  create(@CurrentExpert() expert: IExpert, @Body() dto: CreateTodoDto) {
    return this.todosService.create(expert.sub, dto);
  }

  @Patch(':id')
  async update(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTodoDto,
  ) {
    await this.todosService.update(expert.sub, id, dto);
    return { success: true };
  }

  @Delete(':id')
  async remove(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.todosService.remove(expert.sub, id);
    return { success: true };
  }
}
