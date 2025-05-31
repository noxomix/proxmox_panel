/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTable('permissions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name').unique().notNullable();
    table.string('display_name').notNullable();
    table.text('description').nullable();
    table.string('category').nullable();
    table.boolean('is_system').defaultTo(false);
    table.timestamps(true, true);
    
    // Performance indexes
    table.index('name', 'idx_permissions_name');
    table.index('category', 'idx_permissions_category');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTable('permissions');
};