// Users
export {
  users,
  usersRelations,
  roleEnum,
  platformEnum,
  adminPermissionEnum,
} from './users';
export type { UserRow, NewUserRow } from './users';

// Auth
export {
  otps,
  otpsRelations,
  sessions,
  sessionsRelations,
  sessionTypeEnumValues,
  oauthAccounts,
  oauthAccountsRelations,
  usedTokens,
  usedTokensRelations,
} from './auth';
export type {
  OtpRow,
  NewOtpRow,
  SessionRow,
  NewSessionRow,
  SessionType,
  OAuthAccountRow,
  NewOAuthAccountRow,
  UsedTokenRow,
  NewUsedTokenRow,
} from './auth';

// Client
export {
  clientAccounts,
  clientAccountsRelations,
  userStatusEnum,
  clientFavorites,
  clientFavoritesRelations,
  favoriteItemTypeEnum,
} from './client';
export type {
  ClientAccountRow,
  NewClientAccountRow,
  ClientPreferences,
  ClientFavoriteRow,
  NewClientFavoriteRow,
} from './client';

// Expert
export {
  expertAccounts,
  expertAccountsRelations,
  expertKycStatusEnum,
} from './expert';
export type { ExpertAccountRow, NewExpertAccountRow } from './expert';

// Commerce
export {
  products,
  productsRelations,
  productTypeEnum,
  productGroupEnum,
  productVariants,
  productVariantsRelations,
  carts,
  cartsRelations,
  cartItems,
  cartItemsRelations,
} from './commerce';
export type {
  ProductRow,
  NewProductRow,
  ProductVariantRow,
  CartRow,
  NewCartRow,
  CartItemRow,
  NewCartItemRow,
} from './commerce';

// Addresses
export {
  addresses,
  addressesRelations,
  addressTypeEnum,
  addressTagEnum,
} from './addresses';
export type { AddressRow, NewAddressRow } from './addresses';

// Media
export { media, mediaSourceEnum } from './media';
export type { MediaRow, NewMediaRow } from './media';

import {
  users,
  usersRelations,
  roleEnum,
  platformEnum,
  adminPermissionEnum,
} from './users';
import {
  otps,
  otpsRelations,
  sessions,
  sessionsRelations,
  oauthAccounts,
  oauthAccountsRelations,
  usedTokens,
  usedTokensRelations,
} from './auth';
import {
  clientAccounts,
  clientAccountsRelations,
  userStatusEnum,
  clientFavorites,
  clientFavoritesRelations,
  favoriteItemTypeEnum,
} from './client';
import {
  expertAccounts,
  expertAccountsRelations,
  expertKycStatusEnum,
} from './expert';
import {
  products,
  productsRelations,
  productTypeEnum,
  productGroupEnum,
  productVariants,
  productVariantsRelations,
  carts,
  cartsRelations,
  cartItems,
  cartItemsRelations,
} from './commerce';
import {
  addresses,
  addressesRelations,
  addressTypeEnum,
  addressTagEnum,
} from './addresses';
import { media, mediaSourceEnum } from './media';

/**
 * Combined schema object for `drizzle(pool, { schema })`.
 * Aggregates all domain-dedicated schema tables and relations explicitly.
 */
export const schema = {
  // Users
  users,
  usersRelations,
  roleEnum,
  platformEnum,
  adminPermissionEnum,

  // Auth
  otps,
  otpsRelations,
  sessions,
  sessionsRelations,
  oauthAccounts,
  oauthAccountsRelations,
  usedTokens,
  usedTokensRelations,

  // Client
  clientAccounts,
  clientAccountsRelations,
  userStatusEnum,
  clientFavorites,
  clientFavoritesRelations,
  favoriteItemTypeEnum,

  // Expert
  expertAccounts,
  expertAccountsRelations,
  expertKycStatusEnum,

  // Commerce
  products,
  productsRelations,
  productTypeEnum,
  productGroupEnum,
  productVariants,
  productVariantsRelations,
  carts,
  cartsRelations,
  cartItems,
  cartItemsRelations,

  // Addresses
  addresses,
  addressesRelations,
  addressTypeEnum,
  addressTagEnum,

  // Media
  media,
  mediaSourceEnum,
};
