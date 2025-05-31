import { mysqlTable, varchar, timestamp, index, primaryKey } from 'drizzle-orm/mysql-core';
import { roles } from './roles.js';
import { namespaces } from './namespaces.js';

export const rolesNamespaces = mysqlTable('roles_namespaces', {
  role_id: varchar('role_id', { length: 40 }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  namespace_id: varchar('namespace_id', { length: 40 }).notNull().references(() => namespaces.id, { onDelete: 'restrict' }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.role_id, table.namespace_id] }),
  roleIdIdx: index('role_id_idx').on(table.role_id),
  namespaceIdIdx: index('namespace_id_idx').on(table.namespace_id)
}));