import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import type { AdapterAccount } from 'next-auth/adapters';

export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
  image: text('image'),
  password: text('password'), // For email/password authentication
  mfaEnabled: integer('mfa_enabled', { mode: 'boolean' }).notNull().default(false),
  mfaSecret: text('mfa_secret'), // TOTP secret key (encrypted)
  backupCodes: text('backup_codes'), // JSON array of backup codes (encrypted)
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const accounts = sqliteTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey(account.provider, account.providerAccountId),
  })
);

export const sessions = sqliteTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

export const verificationTokens = sqliteTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey(vt.identifier, vt.token),
  })
);

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  color: text('color').notNull().default('#6366f1'),
  icon: text('icon'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: integer('amount').notNull(), // Store in cents
  description: text('description').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  date: text('date').notNull(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const budgets = sqliteTable('budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  amount: integer('amount').notNull(), // Monthly budget in cents
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'cascade' }),
  month: text('month').notNull(), // Format: YYYY-MM
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

// Recurring Transactions table for managing scheduled transactions
export const recurringTransactions = sqliteTable('recurring_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amount: integer('amount').notNull(), // Store in cents
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] }).notNull(),
  nextDueDate: text('next_due_date').notNull(),
  lastProcessedDate: text('last_processed_date'),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  endDate: text('end_date'), // Optional end date for the recurring transaction
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Financial Goals table for tracking savings and financial targets
export const financialGoals = sqliteTable('financial_goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  targetAmount: integer('target_amount').notNull(), // Target amount in cents
  currentAmount: integer('current_amount').notNull().default(0), // Current saved amount in cents
  targetDate: text('target_date'),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['active', 'completed', 'paused', 'cancelled'] }).notNull().default('active'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium'),
  color: text('color').notNull().default('#6366f1'),
  icon: text('icon'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// User Accounts table for managing multiple bank/financial accounts
export const userAccounts = sqliteTable('user_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['checking', 'savings', 'credit', 'investment', 'loan', 'cash'] }).notNull(),
  balance: integer('balance').notNull().default(0), // Balance in cents
  currency: text('currency').notNull().default('USD'),
  accountNumber: text('account_number'), // Last 4 digits only for security
  institution: text('institution'), // Bank or financial institution name
  color: text('color').notNull().default('#6366f1'),
  icon: text('icon'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Notifications table for user alerts and reminders
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { 
    enum: ['budget_alert', 'goal_reminder', 'bill_due', 'achievement', 'system', 'transaction_alert', 'weekly_summary', 'monthly_summary'] 
  }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'), // JSON string for additional data
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  actionUrl: text('action_url'), // Optional link to relevant page
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  readAt: text('read_at'),
});

// Export types for the new tables
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;
export type FinancialGoal = typeof financialGoals.$inferSelect;
export type NewFinancialGoal = typeof financialGoals.$inferInsert;
export type UserAccount = typeof userAccounts.$inferSelect;
export type NewUserAccount = typeof userAccounts.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;