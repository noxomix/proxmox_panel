import { mysqlTable, varchar, timestamp, index, primaryKey } from 'drizzle-orm/mysql-core';
import { users } from './users.js';
import { namespaces } from './namespaces.js';
import { roles } from './roles.js';

export const userNamespaceRoles = mysqlTable('user_namespace_roles', {
  user_id: varchar('user_id', { length: 40 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  namespace_id: varchar('namespace_id', { length: 40 }).notNull().references(() => namespaces.id, { onDelete: 'restrict' }),
  role_id: varchar('role_id', { length: 40 }).notNull().references(() => roles.id, { onDelete: 'restrict' }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.namespace_id] }),
  userIdIdx: index('user_id_idx').on(table.user_id),
  namespaceIdIdx: index('namespace_id_idx').on(table.namespace_id),
  roleIdIdx: index('role_id_idx').on(table.role_id)
}));