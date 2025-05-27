/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  await knex('permissions').del();

  const permissions = [
    {
      name: 'login',
      display_name: 'Login Access',
      description: 'Allows user to login to the system',
      category: 'authentication',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'api_token_generate',
      display_name: 'Generate API Tokens',
      description: 'Allows user to generate API tokens in profile settings',
      category: 'authentication',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'user_manage',
      display_name: 'Manage Users',
      description: 'Allows user to view and manage other users',
      category: 'user_management',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'user_create',
      display_name: 'Create Users',
      description: 'Allows user to create new users',
      category: 'user_management',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'user_delete',
      display_name: 'Delete Users',
      description: 'Allows user to delete other users',
      category: 'user_management',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'role_manage',
      display_name: 'Manage Roles',
      description: 'Allows user to view and manage roles',
      category: 'role_management',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'permission_manage',
      display_name: 'Manage Permissions',
      description: 'Allows user to view and manage permissions',
      category: 'role_management',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  await knex('permissions').insert(permissions);
};