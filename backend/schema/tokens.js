import { mysqlTable, varchar, timestamp, text, mysqlEnum, index } from 'drizzle-orm/mysql-core';

export const tokens = mysqlTable('tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  user_id: varchar('user_id', { length: 36 }).notNull(),
  token_hash: varchar('token_hash', { length: 64 }).notNull().unique(), // SHA-256 hash
  type: mysqlEnum('type', ['session', 'api']).default('session'),
  user_agent: text('user_agent'),
  ip_address: varchar('ip_address', { length: 45 }),
  expires_at: timestamp('expires_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.user_id),
  tokenHashIdx: index('token_hash_idx').on(table.token_hash),
  typeIdx: index('type_idx').on(table.type)
}));