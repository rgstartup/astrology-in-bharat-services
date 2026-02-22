import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodosController } from './api/controllers/todos.controller';
import { TodosFacade } from './application/todos.facade';
import { FindAllTodosUseCase } from './application/use-cases/find-all-todos.use-case';
import { CreateTodoUseCase } from './application/use-cases/create-todo.use-case';
import { UpdateTodoUseCase } from './application/use-cases/update-todo.use-case';
import { RemoveTodoUseCase } from './application/use-cases/remove-todo.use-case';
import { Todo } from './infrastructure/persistence/entities/todo.entity';
import { ProfileExpert } from '../profile/infrastructure/persistence/entities/profile-expert.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Todo, ProfileExpert])],
    controllers: [TodosController],
    providers: [
        TodosFacade,
        FindAllTodosUseCase,
        CreateTodoUseCase,
        UpdateTodoUseCase,
        RemoveTodoUseCase,
    ],
    exports: [TodosFacade],
})
export class TodosModule { }
