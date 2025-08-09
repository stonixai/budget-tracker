import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './app/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './app/db/database.db',
  },
  verbose: true,
  strict: true,
});