import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProkeralaService } from './prokerala.service';
import { ProkeralaCacheEntity } from './entities/prokerala-cache.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProkeralaCacheEntity])],
  providers: [ProkeralaService],
  exports: [ProkeralaService],
})
export class ProkeralaModule {}
