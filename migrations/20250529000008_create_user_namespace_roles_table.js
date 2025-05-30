/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTable('user_namespace_roles', function(table) {
    table.uuid('user_id').notNullable();
    table.uuid('namespace_id').notNullable();
    table.uuid('role_id').notNullable();
    table.timestamps(true, true);
    
    // Composite primary key
    table.primary(['user_id', 'namespace_id']);
    
    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('namespace_id').references('id').inTable('namespaces').onDelete('RESTRICT');
    table.foreign('role_id').references('id').inTable('roles').onDelete('RESTRICT');
    
    // Performance indexes
    table.index('user_id', 'idx_user_namespace_roles_user_id');
    table.index('namespace_id', 'idx_user_namespace_roles_namespace_id');
    table.index('role_id', 'idx_user_namespace_roles_role_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTable('user_namespace_roles');
};