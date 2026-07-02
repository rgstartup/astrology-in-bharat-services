import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../../infrastructure/entities/todo.entity';
import { UpdateTodoDto } from '../../infrastructure/dto/todo.dto';
import { TodoNotFoundError } from '../../domain/errors/todo-not-found.error';

@Injectable()
export class UpdateTodoUseCase {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
  ) {}

  async execute(expertProfileId: string, id: string, dto: UpdateTodoDto) {
    const todo = await this.todoRepo.findOne({
      where: { id, expert_id: expertProfileId },
    });
    if (!todo) {
      throw new TodoNotFoundError();
    }
    Object.assign(todo, dto);
    await this.todoRepo.save(todo);
    return new BooleanMessage();
  }
}
