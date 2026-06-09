import { Injectable, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../../infrastructure/entities/todo.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { TodoNotFoundError } from '../../domain/errors/todo-not-found.error';

@Injectable()
export class RemoveTodoUseCase {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
    @Inject(forwardRef(() => ExpertProfileFacade))
    private readonly profileFacade: ExpertProfileFacade,
  ) { }

  private async getExpertProfile(userId: string) {
    const profile = await this.profileFacade.getExpertByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Expert profile not found');
    }
    return profile;
  }

  async execute(userId: string, id: string) {
    const profile = await this.getExpertProfile(userId);
    const todo = await this.todoRepo.findOne({
      where: { id, expert_id: profile.id },
    });
    if (!todo) {
      throw new TodoNotFoundError();
    }
    await this.todoRepo.remove(todo);
    return new BooleanMessage();
  }
}
