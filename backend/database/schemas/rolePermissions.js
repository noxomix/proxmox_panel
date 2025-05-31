import { mysqlTable, varchar, timestamp, primaryKey } from 'drizzle-orm/mysql-core';
import { roles } from './roles.js';
import { permissions } from './permissions.js';

export const rolePermissions = mysqlTable('role_permissions', {
  role_id: varchar('role_id', { length: 40 }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permission_id: varchar('permission_id', { length: 40 }).notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').notNull(),
  updated_at: timestamp('updated_at').notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.role_id, table.permission_id] })
}));