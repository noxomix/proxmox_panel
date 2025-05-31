import { mysqlTable, varchar, text, int, timestamp, index, unique } from 'drizzle-orm/mysql-core';

export const namespaces = mysqlTable('namespaces', {
  id: varchar('id', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  parent_id: varchar('parent_id', { length: 40 }).references(() => namespaces.id, { onDelete: 'cascade' }),
  depth: int('depth').notNull().default(0),
  full_path: text('full_path').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow()
}, (table) => ({
  parentIdIdx: index('parent_id_idx').on(table.parent_id),
  depthIdx: index('depth_idx').on(table.depth),
  nameParentIdUnique: unique('namespaces_name_parent_id_unique').on(table.name, table.parent_id),
  fullPathUnique: unique('namespaces_full_path_unique').on(table.full_path)
}));