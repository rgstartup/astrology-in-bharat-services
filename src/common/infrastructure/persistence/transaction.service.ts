import { Injectable } from '@nestjs/common';
import { Repository, QueryRunner, ObjectType, ObjectLiteral } from 'typeorm';

@Injectable()
export abstract class BaseService<Entity extends ObjectLiteral> {
  constructor(protected readonly repository: Repository<Entity>) {}

  protected getRepo(queryRunner?: QueryRunner): Repository<Entity> {
    return queryRunner
      ? queryRunner.manager.getRepository<Entity>(
          this.repository.metadata.target as ObjectType<Entity>,
        )
      : this.repository;
  }
}
