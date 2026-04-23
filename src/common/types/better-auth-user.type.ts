export interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  role: string; // "user" | "admin" — set by Better Auth admin plugin
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
