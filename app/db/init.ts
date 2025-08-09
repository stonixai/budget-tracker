import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const sqlite = new Database('./app/db/database.db');
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: './app/db/migrations' });

console.log('Database initialized successfully!');
sqlite.close();