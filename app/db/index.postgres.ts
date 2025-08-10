import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema.postgres';

// Use Neon serverless driver for PostgreSQL
const sql = neon(process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/budget_tracker');

export const db = drizzle(sql, { schema });

export * from './schema.postgres';