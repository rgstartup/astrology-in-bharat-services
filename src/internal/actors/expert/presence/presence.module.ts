import { Global, Module } from '@nestjs/common';
import { ExpertAvailabilityController } from './controllers/expert-availability.controller';
import { PresenceGateway } from './presence.gateway';
import { PresenceRedisRepository } from './presence-redis.repository';
import { PresenceService } from './presence.service';

@Global()
@Module({
  controllers: [ExpertAvailabilityController],
  providers: [PresenceRedisRepository, PresenceService, PresenceGateway],
  exports: [PresenceService, PresenceGateway],
})
export class PresenceModule {}
