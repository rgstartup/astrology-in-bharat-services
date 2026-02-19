import { Agent, AgentCredential } from '../entities/agent.entity';

export interface IAgentRepository {
    findByEmail(email: string): Promise<Agent | null>;
    findById(id: string): Promise<Agent | null>;
    save(agent: Agent): Promise<Agent>;

    // Credentials
    saveCredential(credential: AgentCredential): Promise<AgentCredential>;
    findCredentials(options: any): Promise<AgentCredential[]>;
    updateCredential(criteria: any, data: Partial<AgentCredential>): Promise<void>;
    createCredential(data: Partial<AgentCredential>): AgentCredential;
}

export const IAgentRepository = Symbol('IAgentRepository');
