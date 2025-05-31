import { mysqlTable, varchar, timestamp, text, boolean } from 'drizzle-orm/mysql-core';

export const roles = mysqlTable('roles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  display_name: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  is_system: boolean('is_system').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
});