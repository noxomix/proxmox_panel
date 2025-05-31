/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTable('role_permissions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('role_id').notNullable();
    table.uuid('permission_id').notNullable();
    table.timestamps(true, true);
    
    // Foreign key constraints
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.foreign('permission_id').references('id').inTable('permissions').onDelete('CASCADE');
    
    // Unique constraint to prevent duplicate assignments
    table.unique(['role_id', 'permission_id'], 'unique_role_permission');
    
    // Performance indexes
    table.index('role_id', 'idx_role_permissions_role_id');
    table.index('permission_id', 'idx_role_permissions_permission_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTable('role_permissions');
};