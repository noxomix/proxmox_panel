/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTable('roles', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name').notNullable();
    table.string('display_name').notNullable();
    table.text('description').nullable();
    table.boolean('is_system').defaultTo(false);
    table.uuid('origin_namespace_id').nullable();
    table.timestamps(true, true);
    
    // Foreign key to namespaces (will be set after namespaces table exists)
    // This will be handled in the data migration step
    
    // Unique constraint: role name per namespace
    table.unique(['name', 'origin_namespace_id'], 'unique_role_name_per_namespace');
    
    // Performance index
    table.index('origin_namespace_id', 'idx_roles_origin_namespace');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTable('roles');
};