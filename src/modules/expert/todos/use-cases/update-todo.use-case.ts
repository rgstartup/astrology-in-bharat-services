import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../entities/todo.entity';
import { UpdateTodoDto } from '../dto/todo.dto';
import { TodoNotFoundError } from '../errors/todo-not-found.error';

@Injectable()
export class UpdateTodoUseCase {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
  ) {}

  async execute(expertAccountId: string, id: string, dto: UpdateTodoDto) {
    const todo = await this.todoRepo.findOne({
      where: { id, expert: { id: expertAccountId } },
    });
    if (!todo) {
      throw new TodoNotFoundError();
    }
    Object.assign(todo, dto);
    await this.todoRepo.save(todo);
    return new BooleanMessage();
  }
}
