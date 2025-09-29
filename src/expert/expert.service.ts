import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CreateExpertDto } from './dto/create-expert.dto';
import { UpdateExpertDto } from './dto/update-expert.dto';
import { expert, Expert } from 'schema/expert.schema';
import { DATABASE_CONNECTION, DbType } from 'src/lib/drizzle';
import { CLIENT_ERRORS } from 'src/common/errors/client.errors';

@Injectable()
export class ExpertService {
  constructor(@Inject(DATABASE_CONNECTION) private db: DbType) {}

  async create(userId: string, createExpertDto: CreateExpertDto) {
    const existingExpert = await this.findOneBy({ user_id: userId });

    if (existingExpert) {
      throw new ConflictException(CLIENT_ERRORS.ALREADY_EXISTS);
    }

    await this.db.insert(expert).values({
      user_id: userId,
      ...createExpertDto,
    });
  }

  findAll() {
    return `This action returns all expert`;
  }

  findOne(id: number) {
    return `This action returns a #${id} expert`;
  }

  update(id: number, updateExpertDto: UpdateExpertDto) {
    return `This action updates a #${id} expert`;
  }

  remove(id: number) {
    return `This action removes a #${id} expert`;
  }

  async findOneBy(field: Partial<Expert>) {
    const [[key, value]] = Object.entries(field);

    return this.db.query.client.findFirst({
      where: (fields, { eq }) => eq(fields[key], value),
    });
  }
}
