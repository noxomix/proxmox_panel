import { mysqlTable, varchar, boolean, timestamp, index, unique } from 'drizzle-orm/mysql-core';
import { namespaces } from './namespaces.js';

export const roles = mysqlTable('roles', {
  id: varchar('id', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  display_name: varchar('display_name', { length: 255 }).notNull(),
  namespace_id: varchar('namespace_id', { length: 40 }).notNull().references(() => namespaces.id, { onDelete: 'restrict' }),
  enabled: boolean('enabled').notNull().default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  namespaceIdIdx: index('namespace_id_idx').on(table.namespace_id),
  enabledIdx: index('enabled_idx').on(table.enabled),
  nameNamespaceIdUnique: unique('roles_name_namespace_id_unique').on(table.name, table.namespace_id)
}));