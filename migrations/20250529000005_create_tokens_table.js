/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTable('tokens', function(table) {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.string('token_hash').nullable();
    table.string('jwt_id').nullable(); // For JWT session tracking
    table.enum('type', ['session', 'api']).defaultTo('session');
    table.string('name').nullable();
    table.text('permissions').nullable();
    table.timestamp('expires_at').nullable();
    table.timestamp('last_used_at').nullable();
    table.string('ip_address').nullable();
    table.text('user_agent').nullable();
    table.timestamps(true, true);
    
    // Foreign key to users
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Performance indexes
    table.index('user_id', 'idx_tokens_user_id');
    table.index('token_hash', 'idx_tokens_token_hash');
    table.index('jwt_id', 'idx_tokens_jwt_id');
    table.index('type', 'idx_tokens_type');
    table.index('expires_at', 'idx_tokens_expires_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTable('tokens');
};