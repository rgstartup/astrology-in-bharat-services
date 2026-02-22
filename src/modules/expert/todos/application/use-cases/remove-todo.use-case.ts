import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../../infrastructure/persistence/entities/todo.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { TodoNotFoundError } from '../../domain/errors/todo-not-found.error';

@Injectable()
export class RemoveTodoUseCase {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) {}

  private async getExpertProfile(userId: number) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!profile) {
      throw new NotFoundException('Expert profile not found');
    }
    return profile;
  }

  async execute(userId: number, id: number) {
    const profile = await this.getExpertProfile(userId);
    const todo = await this.todoRepo.findOne({
      where: { id, expertId: profile.id },
    });
    if (!todo) {
      throw new TodoNotFoundError();
    }
    await this.todoRepo.remove(todo);
    return { success: true };
  }
}
