import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodosService } from './todos.service';
import { TodosController } from './todos.controller';
import { Todo } from './entities/todo.entity';
import { ProfileExpert } from '../profile/entities/profile-expert.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Todo, ProfileExpert])],
    controllers: [TodosController],
    providers: [TodosService],
    exports: [TodosService],
})
export class TodosModule { }
