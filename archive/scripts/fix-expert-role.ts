import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { hasRoles, Role, RoleEnum } from '../../src/modules/users/infrastructure/enums/Role.enum';
import { User } from '../../src/modules/users/infrastructure/entities/user.entity';
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const userId = 133;
    const user = await (queryRunner.manager.getRepository(User) as any).findOne({
      where: { id: userId },
      relations: ['roles']
    });

    if (!user) {
      console.log(`User ${userId} not found.`);
      return;
    }

    console.log(`Current roles for user ${userId}:`, user.roles);

    // let expertRole = await queryRunner.manager.findOne(Role, { where: { name: 'expert' } });
    // if (!expertRole) {
    //   expertRole = queryRunner.manager.create(Role, { name: 'expert' });
    //   await queryRunner.manager.save(expertRole);
    // }

    if (!hasRoles(user.roles, 'EXPERT')) {
      user.roles.push(RoleEnum.EXPERT);
      await queryRunner.manager.save(user);
      console.log(`Expert role successfully added to User ${userId}.`);
    } else {
      console.log(`User ${userId} already has the expert role.`);
    }

  } catch (error) {
    console.error('Error fixing roles:', error);
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
