export * from './users.schema';
export * from './auth.schema';
export * from './client.schema';
export * from './media.schema';

import * as usersSchema from './users.schema';
import * as authSchema from './auth.schema';
import * as clientSchema from './client.schema';
import * as mediaSchema from './media.schema';

/**
 * Combined schema object for `drizzle(pool, { schema })`.
 * Add future per-module schema files here as migration progresses.
 */
export const schema = {
  ...usersSchema,
  ...authSchema,
  ...clientSchema,
  ...mediaSchema,
};
