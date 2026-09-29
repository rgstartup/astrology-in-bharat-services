import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { AddressTag, AddressType } from '../../../enums';
import { clientAccounts } from '../client/client-account.schema';

/**
 * Drizzle mirror of `Address` (`public.addresses` TypeORM entity).
 * Source: src/shared/address/address.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 *
 * Notes for gradual migration:
 * - PG enum type names (`addresses_type_enum`, `addresses_tag_enum`) match
 *   the TypeORM-generated types; do not rename without a DB migration.
 * - `street` is the DB column behind the legacy `line1` property. The JS
 *   key is `street` so identifiers stay snake_case end-to-end.
 * - `profile_expert_id` intentionally has NO FK yet (expert profile not
 *   migrated). `client_account_id` references `client.account` with cascade.
 */
export const addressTypeEnum = pgEnum('addresses_type_enum', AddressType);

export const addressTagEnum = pgEnum('addresses_tag_enum', AddressTag);

export const addresses = pgTable(
  'addresses',
  {
    id: serial('id').primaryKey(),
    type: addressTypeEnum('type').notNull().default(AddressType.SHIPPING),
    street: varchar('street', { length: 255 }).notNull(),
    house_no: varchar('house_no', { length: 100 }),
    city: varchar('city', { length: 100 }),
    district: varchar('district', { length: 100 }),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }),
    zip_code: varchar('zip_code', { length: 10 }),
    pincode: varchar('pincode', { length: 10 }),
    is_primary: boolean('is_primary').notNull().default(false),
    tag: addressTagEnum('tag').notNull().default(AddressTag.HOME),
    profile_expert_id: integer('profile_expert_id'),
    client_account_id: integer('client_account_id').references(
      () => clientAccounts.id,
      { onDelete: 'cascade' },
    ),
  },
  (t) => [
    unique('addresses_profile_expert_tag_unique').on(
      t.profile_expert_id,
      t.tag,
    ),
    unique('addresses_client_account_tag_unique').on(
      t.client_account_id,
      t.tag,
    ),
  ],
);

export const addressesRelations = relations(addresses, ({ one }) => ({
  client_account: one(clientAccounts, {
    fields: [addresses.client_account_id],
    references: [clientAccounts.id],
  }),
}));

export type AddressRow = typeof addresses.$inferSelect;
export type NewAddressRow = typeof addresses.$inferInsert;
