import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { User } from '@/modules/users/domain/entities/user.entity';
import { Todo } from '../../domain/entities/todo.entity';
import { IExpertRepository } from '../../domain/repositories/expert.repository.interface';
import { ITodoRepository } from '../../domain/repositories/todo.repository.interface';
import { CreateTodoDto, UpdateTodoDto } from '../dtos/todo.dto';

@Injectable()
export class TodosService {
    constructor(
        @Inject(ITodoRepository)
        private readonly todoRepository: ITodoRepository,
        @Inject(IExpertRepository)
        private readonly expertRepository: IExpertRepository,
    ) { }

    private async getExpertProfile(userId: number) {
        const profile = await this.expertRepository.findByUserId(userId);
        if (!profile) {
            throw new NotFoundException('Expert profile not found');
        }
        return profile;
    }

    async findAll(user: User) {
        const profile = await this.getExpertProfile(user.id);
        return this.todoRepository.findByExpertId(profile.id);
    }

    async create(user: User, dto: CreateTodoDto) {
        const profile = await this.getExpertProfile(user.id);
        const todo = this.todoRepository.create({
            ...dto,
            expertId: profile.id,
        });
        return this.todoRepository.save(todo);
    }

    async update(user: User, id: number, dto: UpdateTodoDto) {
        const profile = await this.getExpertProfile(user.id);
        const todo = await this.todoRepository.findById(id);

        if (!todo || todo.expertId !== profile.id) {
            throw new NotFoundException('Todo not found');
        }
        Object.assign(todo, dto);
        return this.todoRepository.save(todo);
    }

    async remove(user: User, id: number) {
        const profile = await this.getExpertProfile(user.id);
        const todo = await this.todoRepository.findById(id);

        if (!todo || todo.expertId !== profile.id) {
            throw new NotFoundException('Todo not found');
        }
        await this.todoRepository.remove(todo);
        return { success: true };
    }
}

