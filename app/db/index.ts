import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('./app/db/database.db');
export const db = drizzle(sqlite, { schema });

export { users, posts } from './schema';
export type { User, NewUser, Post, NewPost } from './schema';