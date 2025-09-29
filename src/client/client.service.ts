import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { DATABASE_CONNECTION, DbType } from 'src/lib/drizzle';
import { Client, client } from 'schema/client.schema';
import { CLIENT_ERRORS } from 'src/common/errors/client.errors';

@Injectable()
export class ClientService {
  constructor(@Inject(DATABASE_CONNECTION) private db: DbType) {}

  async create(userId: string, createClientDto: CreateClientDto) {
    const existingClient = await this.findOneBy({ user_id: userId });

    if (existingClient) {
      throw new ConflictException(CLIENT_ERRORS.ALREADY_EXISTS);
    }

    await this.db.insert(client).values({
      user_id: userId,
      date_of_birth: new Date(createClientDto.date_of_birth),
      gender: createClientDto.gender,
    });
  }

  findAll() {
    return `This action returns all client`;
  }

  findOne(id: number) {
    return `This action returns a #${id} client`;
  }

  update(id: number, updateClientDto: UpdateClientDto) {
    return `This action updates a #${id} client`;
  }

  remove(id: number) {
    return `This action removes a #${id} client`;
  }

  async findOneBy(field: Partial<Client>) {
    const [[key, value]] = Object.entries(field);

    return this.db.query.client.findFirst({
      where: (fields, { eq }) => eq(fields[key], value),
    });
  }
}
