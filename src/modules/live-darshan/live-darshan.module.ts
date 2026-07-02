import { Module } from '@nestjs/common';
import { LiveDarshanController } from './api/controllers/live-darshan.controller';
import { LiveDarshanFacade } from './application/live-darshan.facade';
import { GetLiveDarshansUseCase } from './application/use-cases/get-live-darshans.use-case';

@Module({
  controllers: [LiveDarshanController],
  providers: [LiveDarshanFacade, GetLiveDarshansUseCase],
  exports: [LiveDarshanFacade],
})
export class LiveDarshanModule {}
