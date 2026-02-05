import { Credential } from '../entities/credential.entity';

export interface ICredentialRepository {
    findOne(id: number): Promise<Credential | null>;
    find(options: any): Promise<Credential[]>;
    save(credential: Credential): Promise<Credential>;
    create(data: Partial<Credential>): Credential;
    update(criteria: any, data: Partial<Credential>): Promise<void>;
    delete(id: number): Promise<void>;
}

export const ICredentialRepository = Symbol('ICredentialRepository');
