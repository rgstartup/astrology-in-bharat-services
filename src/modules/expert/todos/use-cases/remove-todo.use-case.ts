import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../entities/todo.entity';
import { TodoNotFoundError } from '../errors/todo-not-found.error';

@Injectable()
export class RemoveTodoUseCase {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
  ) {}

  async execute(expertAccountId: string, id: string) {
    const todo = await this.todoRepo.findOne({
      where: { id, expert: { id: expertAccountId } },
    });
    if (!todo) {
      throw new TodoNotFoundError();
    }
    await this.todoRepo.remove(todo);
    return new BooleanMessage();
  }
}
