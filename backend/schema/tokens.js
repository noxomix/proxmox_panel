import { mysqlTable, varchar, timestamp, text, mysqlEnum } from 'drizzle-orm/mysql-core';

export const tokens = mysqlTable('tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  user_id: varchar('user_id', { length: 36 }).notNull(),
  token: text('token').notNull(),
  type: mysqlEnum('type', ['auth', 'api']).default('auth'),
  user_agent: text('user_agent'),
  ip_address: varchar('ip_address', { length: 45 }),
  expires_at: timestamp('expires_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
});