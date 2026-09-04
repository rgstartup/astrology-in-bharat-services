import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IExpert } from '@/common/types/access-token.payload';
import { ExpertPujaDto } from '../../profile/api/dto/expert-puja.dto';
import { ExpertAccount } from '../entities/account.entity';
import { ExpertAccountPuja } from '../entities/account-puja.entity';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';

@Injectable()
export class ExpertAccountPujasUseCase {
  constructor(
    @InjectRepository(ExpertAccount)
    private readonly accounts: Repository<ExpertAccount>,
    @InjectRepository(ExpertAccountPuja)
    private readonly pujas: Repository<ExpertAccountPuja>,
  ) {}

  async upsert(expert: IExpert, dto: ExpertPujaDto, id?: string) {
    const account = await this.accounts.findOneBy({ id: expert.sub });
    if (!account) throw new NotFoundException('Expert account not found');

    const puja = id
      ? await this.pujas.findOneBy({ id, expert_account_id: account.id })
      : this.pujas.create({ account, expert_account_id: account.id });
    if (!puja) throw new NotFoundException('Puja not found');
    Object.assign(puja, dto, {
      puja_image_url: dto.puja_image ?? puja.puja_image_url,
    });
    return this.pujas.save(puja);
  }

  async remove(expert: IExpert, id: string) {
    const account = await this.accounts.findOneBy({ id: expert.sub });

    if (!account) throw new NotFoundException('Expert account not found');

    const result = await this.pujas.delete({
      id,
      expert_account_id: account.id,
    });

    if (!result.affected) throw new NotFoundException('Puja not found');
    return new BooleanMessage(true, 'Pooja Removed');
  }

  list() {
    return this.pujas.find({ relations: { account: true } });
  }

  async byId(id: string) {
    const puja = await this.pujas.findOne({
      where: { id },
      relations: { account: true },
    });
    if (!puja) throw new NotFoundException('Puja not found');
    return puja;
  }

  async updateLikes(id: string, diff: number) {
    await this.pujas.increment({ id }, 'total_likes', diff);
    return this.byId(id);
  }
}
