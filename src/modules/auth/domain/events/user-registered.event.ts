import { RoleEnum } from "@/modules/users/infrastructure/enums/Role.enum";

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly roles: RoleEnum[] = [],
    public readonly verification_token: string,
  ) {}
}
