/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('namespaces', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('name', 255).notNullable();
    table.uuid('parent_id').nullable();
    table.string('full_path', 1000).notNullable().unique();
    table.integer('depth').unsigned().notNullable().defaultTo(0);
    table.string('domain', 255).nullable();
    table.timestamps(true, true);
    
    // Foreign key to self
    table.foreign('parent_id').references('id').inTable('namespaces').onDelete('RESTRICT');
    
    // Indexes for performance
    table.index('parent_id');
    table.index('full_path');
    table.index('depth');
    table.index('domain');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('namespaces');
}
