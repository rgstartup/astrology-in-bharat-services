import { Module } from '@nestjs/common';
import { ExpertAvailabilityController } from './controllers/expert-availability.controller';
import { PresenceRedisRepository } from './presence-redis.repository';
import { PresenceService } from './presence.service';

@Module({
  controllers: [ExpertAvailabilityController],
  providers: [PresenceRedisRepository, PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
