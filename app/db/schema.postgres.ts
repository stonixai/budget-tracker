import { pgTable, text, integer, timestamp, boolean, varchar, uuid, primaryKey, serial } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
  icon: text('icon'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  amount: integer('amount').notNull(),
  description: text('description').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  date: timestamp('date', { mode: 'date' }).notNull(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const budgets = pgTable('budgets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  amount: integer('amount').notNull(),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'cascade' }),
  month: varchar('month', { length: 7 }).notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const recurringTransactions = pgTable('recurring_transactions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amount: integer('amount').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  frequency: text('frequency', { 
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] 
  }).notNull(),
  nextDueDate: timestamp('next_due_date', { mode: 'date' }).notNull(),
  lastProcessedDate: timestamp('last_processed_date', { mode: 'date' }),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  endDate: timestamp('end_date', { mode: 'date' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const financialGoals = pgTable('financial_goals', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  targetAmount: integer('target_amount').notNull(),
  currentAmount: integer('current_amount').notNull().default(0),
  targetDate: timestamp('target_date', { mode: 'date' }),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  status: text('status', { 
    enum: ['active', 'completed', 'paused', 'cancelled'] 
  }).notNull().default('active'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium'),
  color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
  icon: text('icon'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const userAccounts = pgTable('user_accounts', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { 
    enum: ['checking', 'savings', 'credit', 'investment', 'loan', 'cash'] 
  }).notNull(),
  balance: integer('balance').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  accountNumber: varchar('account_number', { length: 4 }),
  institution: text('institution'),
  color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
  icon: text('icon'),
  isActive: boolean('is_active').notNull().default(true),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { 
    enum: ['budget_alert', 'goal_reminder', 'bill_due', 'achievement', 'system', 
           'transaction_alert', 'weekly_summary', 'monthly_summary'] 
  }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'),
  priority: text('priority', { 
    enum: ['low', 'medium', 'high', 'urgent'] 
  }).notNull().default('medium'),
  isRead: boolean('is_read').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
  actionUrl: text('action_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  readAt: timestamp('read_at', { mode: 'date' }),
});

// Export types
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
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;
export type FinancialGoal = typeof financialGoals.$inferSelect;
export type NewFinancialGoal = typeof financialGoals.$inferInsert;
export type UserAccount = typeof userAccounts.$inferSelect;
export type NewUserAccount = typeof userAccounts.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;