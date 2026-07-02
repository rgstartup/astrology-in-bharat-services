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
import {
  CreateTodoDto,
  UpdateTodoDto,
} from '../../infrastructure/dto/todo.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'expert/todos',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todosFacade: TodosFacade) {}

  @Get()
  findAll(@CurrentProfile() expertProfileId: string) {
    return this.todosFacade.findAll(expertProfileId);
  }

  @Post()
  create(@CurrentProfile() expertProfileId: string, @Body() dto: CreateTodoDto) {
    return this.todosFacade.create(expertProfileId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentProfile() expertProfileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTodoDto,
  ) {
    await this.todosFacade.update(expertProfileId, id, dto);
    return { success: true };
  }

  @Delete(':id')
  async remove(
    @CurrentProfile() expertProfileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.todosFacade.remove(expertProfileId, id);
    return { success: true };
  }
}
