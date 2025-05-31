/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export async function seed(knex) {
  console.log('🔄 Migration seed skipped - role_id column no longer exists');
  console.log('✅ Users are now created directly with user_namespace_roles assignments');
  
  // This seed is no longer needed as we removed the role_id column
  // and create users directly with namespace role assignments
}