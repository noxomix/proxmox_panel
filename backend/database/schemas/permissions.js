import { mysqlTable, varchar, text, boolean, timestamp } from 'drizzle-orm/mysql-core';

export const permissions = mysqlTable('permissions', {
  id: varchar('id', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  display_name: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  is_system: boolean('is_system').default(false).notNull(),
  created_at: timestamp('created_at').notNull(),
  updated_at: timestamp('updated_at').notNull()
});