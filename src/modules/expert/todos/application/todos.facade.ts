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

  async findAll(userId: string) {
    return this.findAllTodosUseCase.execute(userId);
  }

  async create(userId: string, dto: CreateTodoDto) {
    return this.createTodoUseCase.execute(userId, dto);
  }

  async update(userId: string, id: string, dto: UpdateTodoDto) {
    return this.updateTodoUseCase.execute(userId, id, dto);
  }

  async remove(userId: string, id: string) {
    return this.removeTodoUseCase.execute(userId, id);
  }
}
