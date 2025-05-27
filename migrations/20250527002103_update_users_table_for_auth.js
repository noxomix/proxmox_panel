/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    // Add username field and rename password to password_hash
    table.string('username').unique().notNullable();
    table.renameColumn('password', 'password_hash');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('username');
    table.renameColumn('password_hash', 'password');
  });
};
