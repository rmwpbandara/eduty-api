import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const urlString = databaseUrl.replace(/^postgresql:/, 'postgres:');
const url = new URL(urlString);

export default new DataSource({
  type: 'postgres',
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  username: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

