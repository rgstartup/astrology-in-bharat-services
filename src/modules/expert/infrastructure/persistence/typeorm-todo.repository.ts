import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../../domain/entities/todo.entity';
import { ITodoRepository } from '../../domain/repositories/todo.repository.interface';

@Injectable()
export class TypeOrmTodoRepository implements ITodoRepository {
    constructor(
        @InjectRepository(Todo)
        private readonly repository: Repository<Todo>,
    ) { }

    async findByExpertId(expertId: number): Promise<Todo[]> {
        return this.repository.find({ where: { expertId }, order: { createdAt: 'DESC' } });
    }

    async findById(id: number): Promise<Todo | null> {
        return this.repository.findOne({ where: { id } });
    }

    async save(todo: Todo): Promise<Todo> {
        return this.repository.save(todo);
    }

    create(data: Partial<Todo>): Todo {
        return this.repository.create(data);
    }

    async remove(todo: Todo): Promise<Todo> {
        return this.repository.remove(todo);
    }
}
