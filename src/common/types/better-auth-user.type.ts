export interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string | null;
  emailVerified: boolean;
  banned: boolean | null;
  createdAt: string;
  updatedAt: string;
}
