import { Todo } from '../entities/todo.entity';

export interface ITodoRepository {
    findByExpertId(expertId: number): Promise<Todo[]>;
    findById(id: number): Promise<Todo | null>;
    save(todo: Todo): Promise<Todo>;
    create(data: Partial<Todo>): Todo;
    remove(todo: Todo): Promise<Todo>;
}

export const ITodoRepository = Symbol('ITodoRepository');
