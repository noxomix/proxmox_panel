import { mysqlTable, varchar, timestamp, text, int } from 'drizzle-orm/mysql-core';

export const namespaces = mysqlTable('namespaces', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  full_path: text('full_path').notNull(),
  domain: varchar('domain', { length: 255 }),
  parent_id: varchar('parent_id', { length: 36 }),
  depth: int('depth').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const userNamespaceRoles = mysqlTable('user_namespace_roles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  user_id: varchar('user_id', { length: 36 }).notNull(),
  namespace_id: varchar('namespace_id', { length: 36 }).notNull(),
  role_id: varchar('role_id', { length: 36 }).notNull(),
  assigned_by: varchar('assigned_by', { length: 36 }),
  assigned_at: timestamp('assigned_at').defaultNow(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
});