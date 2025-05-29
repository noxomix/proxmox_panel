/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('user_namespace_roles', (table) => {
    // Composite primary key columns
    table.uuid('user_id').notNullable();
    table.uuid('namespace_id').notNullable();
    table.uuid('role_id').notNullable();
    
    // Timestamps
    table.timestamps(true, true);
    
    // Composite primary key
    table.primary(['user_id', 'namespace_id']);
    
    // Foreign keys with RESTRICT for data integrity
    table.foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')  // When user is deleted, remove all namespace assignments
      .onUpdate('CASCADE');
    
    table.foreign('namespace_id')
      .references('id')
      .inTable('namespaces')
      .onDelete('RESTRICT')  // Prevent deletion of namespace with assigned users
      .onUpdate('CASCADE');
    
    table.foreign('role_id')
      .references('id')
      .inTable('roles')
      .onDelete('RESTRICT')  // Prevent deletion of role that's assigned to users
      .onUpdate('CASCADE');
    
    // Performance indexes
    table.index(['namespace_id', 'role_id'], 'idx_unr_namespace_role');
    table.index(['user_id'], 'idx_unr_user');
    table.index(['role_id'], 'idx_unr_role');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('user_namespace_roles');
}