import { Injectable } from '@nestjs/common';
import { IHasher } from '../../../shared/contracts/hasher.contract';
import { hash, verify } from '@node-rs/argon2';

@Injectable()
export class Argon2PasswordHasher implements IHasher {
  hash(password: string): Promise<string> {
    return hash(password);
  }

  verify(hash: string, password: string): Promise<boolean> {
    return verify(hash, password);
  }
}
