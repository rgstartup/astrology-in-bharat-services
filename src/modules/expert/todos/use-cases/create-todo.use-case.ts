import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../entities/todo.entity';
import { CreateTodoDto } from '../dto/todo.dto';

@Injectable()
export class CreateTodoUseCase {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
  ) {}

  async execute(expertAccountId: string, dto: CreateTodoDto) {
    const todo = this.todoRepo.create({
      ...dto,
      expert: { id: expertAccountId },
    });
    return this.todoRepo.save(todo);
  }
}
