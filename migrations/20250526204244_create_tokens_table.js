/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTable('tokens', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').notNullable();
    table.string('token_hash').nullable().unique(); // For session tokens (hashed)
    table.text('token').nullable(); // For API tokens (plain text)
    table.string('jwt_id').nullable(); // For JWT session tracking
    table.string('type').defaultTo('session'); // session, api, etc.
    table.string('ip_address').nullable();
    table.text('user_agent').nullable();
    table.datetime('expires_at').notNullable();
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.index(['token_hash']);
    table.index(['user_id']);
    table.index(['expires_at']);
    table.index(['jwt_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTable('tokens');
};
