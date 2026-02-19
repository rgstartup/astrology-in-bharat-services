import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentCredential } from '../../domain/entities/agent.entity';
import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';

@Injectable()
export class TypeOrmAgentRepository implements IAgentRepository {
    constructor(
        @InjectRepository(Agent)
        private readonly repository: Repository<Agent>,
        @InjectRepository(AgentCredential)
        private readonly credentialRepository: Repository<AgentCredential>,
    ) { }

    async findByEmail(email: string): Promise<Agent | null> {
        return this.repository.findOne({
            where: { email },
            select: ['id', 'agent_id', 'name', 'email', 'password', 'phone', 'status', 'avatar'],
        });
    }

    async findById(id: string): Promise<Agent | null> {
        return this.repository.findOne({ where: { id } });
    }

    async save(agent: Agent): Promise<Agent> {
        return this.repository.save(agent);
    }

    async saveCredential(credential: AgentCredential): Promise<AgentCredential> {
        return this.credentialRepository.save(credential);
    }

    async findCredentials(options: any): Promise<AgentCredential[]> {
        return this.credentialRepository.find(options);
    }

    async updateCredential(criteria: any, data: Partial<AgentCredential>): Promise<void> {
        await this.credentialRepository.update(criteria, data);
    }

    createCredential(data: Partial<AgentCredential>): AgentCredential {
        return this.credentialRepository.create(data);
    }
}
