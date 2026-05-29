import { Injectable } from '@nestjs/common';
import { IHasher } from '@/common/contracts/hasher.contract';
import * as argon2 from 'argon2';

@Injectable()
export class Argon2PasswordHasher implements IHasher {
  hash(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  verify(hash: string, password: string) {
    return argon2.verify(hash, password);
  }
}
