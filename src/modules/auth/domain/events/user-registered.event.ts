import { RoleEnum } from '@/modules/users/enums/Role.enum';

export class UserRegisteredEvent {
  constructor(
    public readonly userId: number | string,
    public readonly email: string,
    public readonly name: string,
    public readonly role: RoleEnum,
    public readonly verification_token: string,
  ) { }
}

export class ClientRegisteredEvent {
  constructor(
    public readonly userId: number | string,
    public readonly email: string,
    public readonly name: string,
    public readonly verification_token: string,
  ) { }
}

