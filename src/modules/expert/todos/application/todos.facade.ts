import { Injectable } from '@nestjs/common';
import { FindAllTodosUseCase } from './use-cases/find-all-todos.use-case';
import { CreateTodoUseCase } from './use-cases/create-todo.use-case';
import { UpdateTodoUseCase } from './use-cases/update-todo.use-case';
import { RemoveTodoUseCase } from './use-cases/remove-todo.use-case';
import { CreateTodoDto, UpdateTodoDto } from '../infrastructure/dto/todo.dto';

@Injectable()
export class TodosFacade {
  constructor(
    private readonly findAllTodosUseCase: FindAllTodosUseCase,
    private readonly createTodoUseCase: CreateTodoUseCase,
    private readonly updateTodoUseCase: UpdateTodoUseCase,
    private readonly removeTodoUseCase: RemoveTodoUseCase,
  ) {}

  async findAll(expertProfileId: string) {
    return this.findAllTodosUseCase.execute(expertProfileId);
  }

  async create(expertProfileId: string, dto: CreateTodoDto) {
    return this.createTodoUseCase.execute(expertProfileId, dto);
  }

  async update(expertProfileId: string, id: string, dto: UpdateTodoDto) {
    return this.updateTodoUseCase.execute(expertProfileId, id, dto);
  }

  async remove(expertProfileId: string, id: string) {
    return this.removeTodoUseCase.execute(expertProfileId, id);
  }
}
