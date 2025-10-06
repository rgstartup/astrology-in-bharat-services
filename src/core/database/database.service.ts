import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class DatabaseService {
  constructor(private dataSource: DataSource) {}

  getQueryRunner(): QueryRunner {
    return this.dataSource.createQueryRunner();
  }

  async transaction<T>(
    work: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.getQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.log({ err });
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
