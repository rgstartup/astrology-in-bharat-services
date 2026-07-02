import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../../infrastructure/entities/todo.entity';
import { TodoNotFoundError } from '../../domain/errors/todo-not-found.error';

@Injectable()
export class RemoveTodoUseCase {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
  ) {}

  async execute(expertProfileId: string, id: string) {
    const todo = await this.todoRepo.findOne({
      where: { id, expert_id: expertProfileId },
    });
    if (!todo) {
      throw new TodoNotFoundError();
    }
    await this.todoRepo.remove(todo);
    return new BooleanMessage();
  }
}
