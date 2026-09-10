import { Injectable, Logger } from '@nestjs/common';
import {
  ISeeder,
  SeederExecutionSummary,
  SeederRunOptions,
} from './interfaces/seeder.interface';
import { AdminSeeder } from './seeders/admin.seeder';
import { SystemSettingSeeder } from './seeders/system-setting.seeder';
import { ConsultationTopicSeeder } from './seeders/consultation-topic.seeder';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);
  private readonly seeders: ISeeder[];

  constructor(
    private readonly adminSeeder: AdminSeeder,
    private readonly systemSettingSeeder: SystemSettingSeeder,
    private readonly consultationTopicSeeder: ConsultationTopicSeeder,
  ) {
    // Registered seeders in execution order
    this.seeders = [
      this.adminSeeder,
      this.systemSettingSeeder,
      this.consultationTopicSeeder,
    ];
  }

  /**
   * Get list of all registered seeder names
   */
  getRegisteredSeederNames(): string[] {
    return this.seeders.map((s) => s.name);
  }

  /**
   * Run seeders based on options
   */
  async run(options: SeederRunOptions = {}): Promise<SeederExecutionSummary[]> {
    const startTime = Date.now();
    this.logger.log('Starting TypeORM database seeding process...');

    const targetSeeders = this.resolveSeeders(options.seeders);

    if (targetSeeders.length === 0) {
      this.logger.warn('No matching seeders found to execute.');
      return [];
    }

    const summaries: SeederExecutionSummary[] = [];

    for (const seeder of targetSeeders) {
      const seederStart = Date.now();
      try {
        if (options.refresh && typeof seeder.drop === 'function') {
          this.logger.log(`Refreshing [${seeder.name}]...`);
          await seeder.drop();
        }

        this.logger.log(`Running [${seeder.name}]...`);
        await seeder.run();

        const durationMs = Date.now() - seederStart;
        this.logger.log(`Completed [${seeder.name}] in ${durationMs}ms`);

        summaries.push({
          name: seeder.name,
          status: 'SUCCESS',
          durationMs,
        });
      } catch (error) {
        const durationMs = Date.now() - seederStart;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed [${seeder.name}] after ${durationMs}ms: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );

        summaries.push({
          name: seeder.name,
          status: 'FAILED',
          durationMs,
          error,
          message: errorMessage,
        });

        // Abort further seeding on error to maintain integrity
        break;
      }
    }

    const totalDuration = Date.now() - startTime;
    this.printSummary(summaries, totalDuration);

    const hasFailure = summaries.some((s) => s.status === 'FAILED');
    if (hasFailure) {
      throw new Error('One or more seeders failed during execution.');
    }

    return summaries;
  }

  private resolveSeeders(requestedNames?: string[]): ISeeder[] {
    if (!requestedNames || requestedNames.length === 0) {
      return this.seeders;
    }

    const normalizedRequested = requestedNames.map((n) => n.toLowerCase().trim());
    return this.seeders.filter((seeder) =>
      normalizedRequested.includes(seeder.name.toLowerCase().trim()),
    );
  }

  private printSummary(summaries: SeederExecutionSummary[], totalDurationMs: number): void {
    const successCount = summaries.filter((s) => s.status === 'SUCCESS').length;
    const failCount = summaries.filter((s) => s.status === 'FAILED').length;

    this.logger.log('================ SEEDING SUMMARY ================');
    for (const s of summaries) {
      const mark = s.status === 'SUCCESS' ? '✔' : '✖';
      this.logger.log(`${mark} ${s.name}: ${s.status} (${s.durationMs}ms)`);
    }
    this.logger.log('--------------------------------------------------');
    this.logger.log(
      `Total: ${summaries.length} | Passed: ${successCount} | Failed: ${failCount} | Total Time: ${totalDurationMs}ms`,
    );
    this.logger.log('==================================================');
  }
}
