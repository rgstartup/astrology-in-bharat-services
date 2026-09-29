export interface IHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export const IHasherToken = Symbol('IHasher');
