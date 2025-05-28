/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex('permissions').insert({
    id: knex.raw('(SELECT UUID())'),
    name: 'user_role_assign',
    display_name: 'Assign User Roles',
    description: 'Can assign roles to users (still limited by role hierarchy)',
    category: 'user',
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex('permissions').where('name', 'user_role_assign').del();
}