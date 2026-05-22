import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../../infrastructure/entities/todo.entity';
import { CreateTodoDto } from '../../infrastructure/dto/todo.dto';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

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
      where: { user: { id: userId as any } },
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
