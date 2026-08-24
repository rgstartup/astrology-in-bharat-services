import { User } from "@/modules/users/infrastructure/entities/user.entity";

export interface UserWithTokens {
    user: User;
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
    redirect_uri?: string;
}