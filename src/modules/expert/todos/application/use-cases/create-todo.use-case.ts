import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../../infrastructure/entities/todo.entity';
import { CreateTodoDto } from '../../infrastructure/dto/todo.dto';

@Injectable()
export class CreateTodoUseCase {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
  ) {}

  async execute(expertProfileId: string, dto: CreateTodoDto) {
    const todo = this.todoRepo.create({ ...dto, expert_id: expertProfileId });
    return this.todoRepo.save(todo);
  }
}
