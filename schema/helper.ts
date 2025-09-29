import { pgEnum, timestamp } from 'drizzle-orm/pg-core';

export const timestampTz = (name: string) => {
  return timestamp(name, {
    mode: 'date',
    withTimezone: true,
  });
};

export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

export const Roles = {
  CLIENT: 'client',
  EXPERT: 'expert',
  ADMIN: 'admin',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
