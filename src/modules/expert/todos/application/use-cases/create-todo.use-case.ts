import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../../infrastructure/persistence/entities/todo.entity';
import { CreateTodoDto } from '../../infrastructure/persistence/dto/todo.dto';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

@Injectable()
export class CreateTodoUseCase {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) {}

  private async getExpertProfile(userId: string) {
    const profile = await this.profileRepo.findOne({
      where: { better_auth_user_id: userId },
    });
    if (!profile) {
      throw new NotFoundException('Expert profile not found');
    }
    return profile;
  }

  async execute(userId: string, dto: CreateTodoDto) {
    const profile = await this.getExpertProfile(userId);
    const todo = this.todoRepo.create({
      ...dto,
      expert_id: profile.id,
    });
    return this.todoRepo.save(todo);
  }
}
