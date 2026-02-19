import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent, AgentCredential } from './domain/entities/agent.entity';
import { AgentOtp } from './domain/entities/agent-otp.entity';
import { IAgentRepository } from './domain/repositories/agent.repository.interface';
import { TypeOrmAgentRepository } from './infrastructure/persistence/typeorm-agent.repository';
import { AgentLoginUseCase } from './application/use-cases/agent-login.use-case';
import { AgentController } from './interfaces/controllers/agent.controller';
import { AgentJwtStrategy } from './infrastructure/strategies/agent-jwt.strategy';
import { AgentService } from './application/services/agent.service';
import { CloudinaryModule } from '@/common/infrastructure/storage/cloudinary/cloudinary.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Agent, AgentCredential, AgentOtp]),
        CloudinaryModule,
    ],
    controllers: [AgentController],
    providers: [
        AgentLoginUseCase,
        AgentJwtStrategy,
        AgentService,
        {
            provide: IAgentRepository,
            useClass: TypeOrmAgentRepository,
        },
    ],
    exports: [AgentLoginUseCase, IAgentRepository, AgentService],
})
export class AgentModule { }
