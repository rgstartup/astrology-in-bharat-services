import { BetterAuthOptions } from 'better-auth/*';
import type { UserMetadata } from 'schema/auth.schema';

export const UserConfig: BetterAuthOptions['user'] = {
  additionalFields: {
    metadata: {
      type: 'json',
      required: true,
      input: true,
    },
  },
};
