export const sessionTypeEnumValues = [
  'refresh_token',
  'api_key',
  'device_session',
] as const;

export type SessionType = (typeof sessionTypeEnumValues)[number];
