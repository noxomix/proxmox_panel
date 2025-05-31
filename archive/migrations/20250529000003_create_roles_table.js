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
    
    // Foreign key to namespaces
    table.foreign('origin_namespace_id')
      .references('id')
      .inTable('namespaces')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    
    // Unique constraint: role name per namespace
    table.unique(['name', 'origin_namespace_id'], 'unique_role_name_per_namespace');
    
    // Performance indexes
    table.index('origin_namespace_id', 'idx_roles_origin_namespace');
    table.index('name', 'idx_roles_name');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTable('roles');
};