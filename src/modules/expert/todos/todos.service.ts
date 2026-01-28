import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from './entities/todo.entity';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto';
import { User } from '@/modules/users/entities/user.entity';
import { ProfileExpert } from '../profile/entities/profile-expert.entity';

@Injectable()
export class TodosService {
    constructor(
        @InjectRepository(Todo)
        private readonly todoRepo: Repository<Todo>,
        @InjectRepository(ProfileExpert)
        private readonly profileRepo: Repository<ProfileExpert>,
    ) { }

    private async getExpertProfile(userId: number) {
        const profile = await this.profileRepo.findOne({
            where: { user: { id: userId } },
        });
        if (!profile) {
            throw new NotFoundException('Expert profile not found');
        }
        return profile;
    }

    async findAll(user: User) {
        const profile = await this.getExpertProfile(user.id);
        return this.todoRepo.find({
            where: { expertId: profile.id },
            order: { createdAt: 'DESC' },
        });
    }

    async create(user: User, dto: CreateTodoDto) {
        const profile = await this.getExpertProfile(user.id);
        const todo = this.todoRepo.create({
            ...dto,
            expertId: profile.id,
        });
        return this.todoRepo.save(todo);
    }

    async update(user: User, id: number, dto: UpdateTodoDto) {
        const profile = await this.getExpertProfile(user.id);
        const todo = await this.todoRepo.findOne({
            where: { id, expertId: profile.id },
        });
        if (!todo) {
            throw new NotFoundException('Todo not found');
        }
        Object.assign(todo, dto);
        return this.todoRepo.save(todo);
    }

    async remove(user: User, id: number) {
        const profile = await this.getExpertProfile(user.id);
        const todo = await this.todoRepo.findOne({
            where: { id, expertId: profile.id },
        });
        if (!todo) {
            throw new NotFoundException('Todo not found');
        }
        await this.todoRepo.remove(todo);
        return { success: true };
    }
}
