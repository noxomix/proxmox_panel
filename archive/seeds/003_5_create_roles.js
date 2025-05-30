/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  await knex('role_permissions').del();
  await knex('roles').del();

  // Get root namespace ID (depth = 0, parent_id = null)
  const rootNamespace = await knex('namespaces')
    .where({ depth: 0, parent_id: null })
    .first();
  
  if (!rootNamespace) {
    throw new Error('Root namespace not found. Run namespace seed first.');
  }

  const roles = [
    {
      name: 'admin',
      display_name: 'Administrator',
      description: 'Full system administrator with all permissions',
      is_system: true,
      origin_namespace_id: rootNamespace.id,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'manager',
      display_name: 'Manager',
      description: 'Management access with user and role assignment capabilities',
      is_system: true,
      origin_namespace_id: rootNamespace.id,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'customer',
      display_name: 'Customer',
      description: 'Regular customer with basic access permissions',
      is_system: true,
      origin_namespace_id: rootNamespace.id,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  await knex('roles').insert(roles);

  const adminRole = await knex('roles').where('name', 'admin').first();
  const managerRole = await knex('roles').where('name', 'manager').first();
  const customerRole = await knex('roles').where('name', 'customer').first();
  const permissions = await knex('permissions').select('id', 'name');
  
  // Admin gets all permissions
  const adminPermissions = permissions.map(permission => ({
    role_id: adminRole.id,
    permission_id: permission.id,
    created_at: new Date(),
    updated_at: new Date()
  }));

  // Manager gets user management and role assignment permissions
  const managerPermissionNames = [
    'login', 'api_token_generate', 'user_create', 
    'user_index', 'user_show', 'user_update', 'user_delete', 
    'user_role_assign', 'user_permissions_view',
    'user_permissions_edit', 'roles_list', 'permissions_list'
  ];
  const managerPermissions = permissions
    .filter(permission => managerPermissionNames.includes(permission.name))
    .map(permission => ({
      role_id: managerRole.id,
      permission_id: permission.id,
      created_at: new Date(),
      updated_at: new Date()
    }));

  // Customer gets basic permissions (no user management)
  const customerPermissionNames = ['login', 'api_token_generate'];
  const customerPermissions = permissions
    .filter(permission => customerPermissionNames.includes(permission.name))
    .map(permission => ({
      role_id: customerRole.id,
      permission_id: permission.id,
      created_at: new Date(),
      updated_at: new Date()
    }));

  await knex('role_permissions').insert([
    ...adminPermissions, 
    ...managerPermissions, 
    ...customerPermissions
  ]);
};