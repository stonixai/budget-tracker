import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../app/db/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

// Create in-memory test database
const sqlite = new Database(':memory:');
export const testDb = sqlite;
export const db = drizzle(sqlite, { schema });

// Initialize test database with schema
function initializeTestDb() {
  // Read and execute migration files to create schema
  try {
    const migrationPath = join(process.cwd(), 'app', 'db', 'migrations', '0000_safe_wildside.sql');
    const migration0 = readFileSync(migrationPath, 'utf8');
    testDb.exec(migration0);

    const migration1Path = join(process.cwd(), 'app', 'db', 'migrations', '0001_huge_bedlam.sql');
    const migration1 = readFileSync(migration1Path, 'utf8');
    testDb.exec(migration1);
  } catch (error) {
    console.error('Error initializing test database:', error);
    // Fallback: create tables manually
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        color TEXT NOT NULL DEFAULT '#6366f1',
        icon TEXT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount INTEGER NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        date TEXT NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        month TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        published INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  // Enable foreign key constraints
  testDb.exec('PRAGMA foreign_keys = ON');
}

// Clean all data from test database
export function cleanDatabase() {
  testDb.exec('PRAGMA foreign_keys = OFF');
  
  const tables = ['transactions', 'budgets', 'categories', 'posts', 'users'];
  for (const table of tables) {
    testDb.exec(`DELETE FROM ${table}`);
  }
  
  testDb.exec('PRAGMA foreign_keys = ON');
}

// Initialize the test database
initializeTestDb();