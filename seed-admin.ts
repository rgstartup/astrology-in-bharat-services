import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { UsersFacade } from './src/modules/users/application/users.facade';
import { IHasherToken } from './src/common/contracts/hasher.contract';
import { RoleEnum } from './src/modules/users/infrastructure/enums/Role.enum';
import { DatabaseService } from './src/core/database/database.service';
import { AuthProfileCreationResolver } from './src/modules/auth/application/strategies/create-profile/auth-profile-creation.resolver';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const usersFacade = app.get(UsersFacade);
  const hasher = app.get(IHasherToken);
  const db = app.get(DatabaseService);
  const profileCreationResolver = app.get(AuthProfileCreationResolver);

  const email = 'admin@gmail.com';
  const password = '123456';
  
  const existingUser = await usersFacade.findByEmail(email);
  if (existingUser) {
    console.log('Admin already exists!');
    await app.close();
    return;
  }

  const hashedPassword = await hasher.hash(password);

  await db.transaction(async (queryRunner) => {
    const user = await usersFacade.create(
      {
        name: 'Admin',
        email: email,
        password: hashedPassword,
        roles: [RoleEnum.ADMIN],
        email_verified_at: new Date(),
      },
      queryRunner,
    );
    // Note: ensureProfile might not have a strategy for ADMIN, let's wrap it in try-catch just in case
    try {
       await profileCreationResolver.ensureProfile(user, queryRunner);
    } catch (e) {
       console.log('Skipping profile creation (Admin might not need a profile entity). Error:', e.message);
    }
    console.log('Admin created successfully with ID:', user.id);
  });

  await app.close();
}
bootstrap();
