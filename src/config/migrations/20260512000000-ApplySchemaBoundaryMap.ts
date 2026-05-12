import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMAS = [
  'auth',
  'client',
  'expert',
  'merchant',
  'agent',
  'consultations',
  'commerce',
  'finance',
  'support',
  'content',
  'admin',
] as const;

const TABLE_MAPPINGS: Array<{
  sourceTable: string;
  targetSchema: string;
  targetTable?: string;
}> = [
  { sourceTable: 'sessions', targetSchema: 'auth' },
  { sourceTable: 'oauth_accounts', targetSchema: 'auth' },
  { sourceTable: 'used_tokens', targetSchema: 'auth' },
  { sourceTable: 'profile_clients', targetSchema: 'client', targetTable: 'profile' },
  { sourceTable: 'profile_experts', targetSchema: 'expert', targetTable: 'profile' },
  { sourceTable: 'expert_bank_accounts', targetSchema: 'expert', targetTable: 'bank_accounts' },
  { sourceTable: 'expert_todos', targetSchema: 'expert', targetTable: 'todos' },
  { sourceTable: 'expert_pujas', targetSchema: 'expert', targetTable: 'pujas' },
  { sourceTable: 'profile_merchants', targetSchema: 'merchant', targetTable: 'profile' },
  { sourceTable: 'agent_profiles', targetSchema: 'agent', targetTable: 'profile' },
  { sourceTable: 'agent_listings', targetSchema: 'agent', targetTable: 'listings' },
  { sourceTable: 'chat_sessions', targetSchema: 'consultations' },
  { sourceTable: 'chat_messages', targetSchema: 'consultations' },
  { sourceTable: 'call_sessions', targetSchema: 'consultations' },
  { sourceTable: 'quotes', targetSchema: 'consultations' },
  { sourceTable: 'reviews', targetSchema: 'consultations' },
  { sourceTable: 'puja_appointments', targetSchema: 'consultations' },
  { sourceTable: 'products', targetSchema: 'commerce' },
  { sourceTable: 'carts', targetSchema: 'commerce' },
  { sourceTable: 'cart_items', targetSchema: 'commerce' },
  { sourceTable: 'wishlists', targetSchema: 'commerce' },
  { sourceTable: 'coupons', targetSchema: 'commerce' },
  { sourceTable: 'user_coupons', targetSchema: 'commerce' },
  { sourceTable: 'product_orders', targetSchema: 'commerce' },
  { sourceTable: 'order_items', targetSchema: 'commerce' },
  { sourceTable: 'wallets', targetSchema: 'finance' },
  { sourceTable: 'transactions', targetSchema: 'finance' },
  { sourceTable: 'withdrawals', targetSchema: 'finance' },
  { sourceTable: 'payment_orders', targetSchema: 'finance' },
  { sourceTable: 'idempotency_keys', targetSchema: 'finance' },
  { sourceTable: 'support_disputes', targetSchema: 'support' },
  { sourceTable: 'support_dispute_messages', targetSchema: 'support' },
  { sourceTable: 'notifications', targetSchema: 'support' },
  { sourceTable: 'festivals', targetSchema: 'content' },
  { sourceTable: 'calendar_cache', targetSchema: 'content' },
  { sourceTable: 'places_cache', targetSchema: 'content' },
  { sourceTable: 'place_images_cache', targetSchema: 'content' },
  { sourceTable: 'admin_audit_logs', targetSchema: 'admin' },
  { sourceTable: 'system_settings', targetSchema: 'admin' },
];

export class ApplySchemaBoundaryMap20260512000000
  implements MigrationInterface
{
  name = 'ApplySchemaBoundaryMap20260512000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const schema of SCHEMAS) {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    }

    for (const mapping of TABLE_MAPPINGS) {
      const targetTable = mapping.targetTable ?? mapping.sourceTable;

      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = '${mapping.targetSchema}'
              AND table_name = '${targetTable}'
          ) THEN
            RETURN;
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = '${mapping.targetSchema}'
              AND table_name = '${mapping.sourceTable}'
          ) THEN
            ${
              mapping.sourceTable !== targetTable
                ? `EXECUTE 'ALTER TABLE "${mapping.targetSchema}"."${mapping.sourceTable}" RENAME TO "${targetTable}"';`
                : `NULL;`
            }
            RETURN;
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = '${mapping.sourceTable}'
          ) THEN
            EXECUTE 'ALTER TABLE public."${mapping.sourceTable}" SET SCHEMA "${mapping.targetSchema}"';
            ${
              mapping.sourceTable !== targetTable
                ? `EXECUTE 'ALTER TABLE "${mapping.targetSchema}"."${mapping.sourceTable}" RENAME TO "${targetTable}"';`
                : `NULL;`
            }
          END IF;
        END
        $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const mapping of [...TABLE_MAPPINGS].reverse()) {
      const targetTable = mapping.targetTable ?? mapping.sourceTable;

      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = '${mapping.sourceTable}'
          ) THEN
            RETURN;
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = '${mapping.targetSchema}'
              AND table_name = '${targetTable}'
          ) THEN
            ${
              mapping.sourceTable !== targetTable
                ? `EXECUTE 'ALTER TABLE "${mapping.targetSchema}"."${targetTable}" RENAME TO "${mapping.sourceTable}"';`
                : `NULL;`
            }
            EXECUTE 'ALTER TABLE "${mapping.targetSchema}"."${mapping.sourceTable}" SET SCHEMA public';
          END IF;
        END
        $$;
      `);
    }

    for (const schema of [...SCHEMAS].reverse()) {
      await queryRunner.query(`DROP SCHEMA IF EXISTS "${schema}"`);
    }
  }
}
