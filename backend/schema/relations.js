import { relations } from 'drizzle-orm';
import { tokens } from './tokens.js';
import { users } from './users.js';
import { namespaces } from './namespaces.js';
import { roles } from './roles.js';
import { rolesNamespaces } from './rolesNamespaces.js';
import { userNamespaceRoles } from './userNamespaceRoles.js';

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  tokens: many(tokens),
  userNamespaceRoles: many(userNamespaceRoles)
}));

// Token relations
export const tokensRelations = relations(tokens, ({ one }) => ({
  user: one(users, {
    fields: [tokens.user_id],
    references: [users.id]
  })
}));

// Namespace relations
export const namespacesRelations = relations(namespaces, ({ one, many }) => ({
  parent: one(namespaces, {
    fields: [namespaces.parent_id],
    references: [namespaces.id],
    relationName: 'parent'
  }),
  children: many(namespaces, { relationName: 'parent' }),
  roles: many(roles),
  rolesNamespaces: many(rolesNamespaces),
  userNamespaceRoles: many(userNamespaceRoles)
}));

// Role relations
export const rolesRelations = relations(roles, ({ one, many }) => ({
  namespace: one(namespaces, {
    fields: [roles.namespace_id],
    references: [namespaces.id]
  }),
  rolesNamespaces: many(rolesNamespaces),
  userNamespaceRoles: many(userNamespaceRoles)
}));

// RolesNamespaces relations
export const rolesNamespacesRelations = relations(rolesNamespaces, ({ one }) => ({
  role: one(roles, {
    fields: [rolesNamespaces.role_id],
    references: [roles.id]
  }),
  namespace: one(namespaces, {
    fields: [rolesNamespaces.namespace_id],
    references: [namespaces.id]
  })
}));

// UserNamespaceRoles relations
export const userNamespaceRolesRelations = relations(userNamespaceRoles, ({ one }) => ({
  user: one(users, {
    fields: [userNamespaceRoles.user_id],
    references: [users.id]
  }),
  namespace: one(namespaces, {
    fields: [userNamespaceRoles.namespace_id],
    references: [namespaces.id]
  }),
  role: one(roles, {
    fields: [userNamespaceRoles.role_id],
    references: [roles.id]
  })
}));