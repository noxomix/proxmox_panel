/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.alterTable('tokens', function(table) {
    table.string('jwt_id').nullable().after('token_hash');
    table.index('jwt_id');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.alterTable('tokens', function(table) {
    table.dropIndex('jwt_id');
    table.dropColumn('jwt_id');
  });
}
