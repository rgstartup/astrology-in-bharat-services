import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../entities/todo.entity';

@Injectable()
export class FindAllTodosUseCase {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
  ) {}

  async execute(expertAccountId: string) {
    return this.todoRepo.find({
      where: { expert: { id: expertAccountId } },
      order: { created_at: 'DESC' },
    });
  }
}
