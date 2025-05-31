import { mysqlTable, varchar, timestamp, text } from 'drizzle-orm/mysql-core';

export const permissions = mysqlTable('permissions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  display_name: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const rolePermissions = mysqlTable('role_permissions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  role_id: varchar('role_id', { length: 36 }).notNull(),
  permission_id: varchar('permission_id', { length: 36 }).notNull(),
  created_at: timestamp('created_at').defaultNow()
});