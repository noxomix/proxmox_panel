/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTable('namespaces', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name').notNullable();
    table.uuid('parent_id').nullable();
    table.text('full_path').notNullable();
    table.integer('depth').notNullable().defaultTo(0);
    table.string('domain').nullable();
    table.timestamps(true, true);
    
    // Foreign key constraint for parent namespace
    table.foreign('parent_id').references('id').inTable('namespaces').onDelete('CASCADE');
    
    // Unique constraints
    table.unique(['name', 'parent_id'], 'unique_namespace_name_per_parent');
    table.unique('full_path', 'unique_namespace_full_path');
    
    // Performance indexes
    table.index('parent_id', 'idx_namespaces_parent_id');
    table.index('depth', 'idx_namespaces_depth');
    table.index('full_path', 'idx_namespaces_full_path');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTable('namespaces');
};