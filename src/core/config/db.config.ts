import { registerAs } from '@nestjs/config';
import { DataSource } from 'typeorm';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  max_connections: number;
}

export default registerAs<Partial<DatabaseConfig>>('database', () => ({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  max_connections: process.env.DB_MAX_CONNECTIONS
    ? parseInt(process.env.DB_MAX_CONNECTIONS, 10)
    : 100,
}));

import 'dotenv/config';