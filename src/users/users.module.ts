import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  //   providers: [UsersController],
})
export class UsersModule {}
