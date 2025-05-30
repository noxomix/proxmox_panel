/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name').notNullable();
    table.string('username').unique().notNullable();
    table.string('email').unique().notNullable();
    table.uuid('role_id').nullable();
    table.string('password_hash').notNullable();
    table.enum('status', ['active', 'disabled', 'blocked']).defaultTo('active');
    table.timestamps(true, true);
    
    // Foreign key to roles
    table.foreign('role_id').references('id').inTable('roles').onDelete('SET NULL');
    
    // Performance indexes
    table.index('email', 'idx_users_email');
    table.index('username', 'idx_users_username');
    table.index('role_id', 'idx_users_role_id');
    table.index('status', 'idx_users_status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTable('users');
};