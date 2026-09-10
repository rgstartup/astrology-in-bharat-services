export interface ISeeder {
  /**
   * Unique name identifier for the seeder
   */
  readonly name: string;

  /**
   * Execute the seeding logic
   */
  run(): Promise<void>;

  /**
   * Optional method to truncate or revert seeded data
   */
  drop?(): Promise<void>;
}

export interface SeederRunOptions {
  /**
   * List of specific seeder names to run. If not provided or empty, all seeders run.
   */
  seeders?: string[];

  /**
   * If true, runs drop() prior to run() on seeders that support it.
   */
  refresh?: boolean;
}

export interface SeederExecutionSummary {
  name: string;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  durationMs: number;
  message?: string;
  error?: unknown;
}
