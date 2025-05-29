/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.transaction(async (trx) => {
    // First, assign all existing roles to the root namespace
    const rootNamespace = await trx('namespaces')
      .where({ parent_id: null })
      .first();
    
    if (rootNamespace) {
      await trx('roles')
        .whereNull('origin_namespace_id')
        .update({ origin_namespace_id: rootNamespace.id });
    }
    
    // Then add the foreign key constraint
    await trx.schema.alterTable('roles', (table) => {
      table.foreign('origin_namespace_id')
        .references('id')
        .inTable('namespaces')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE');
    });
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.alterTable('roles', (table) => {
    table.dropForeign('origin_namespace_id');
  });
}