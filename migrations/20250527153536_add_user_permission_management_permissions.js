/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function(knex) {
  // Add new user permission management permissions
  const newPermissions = [
    {
      name: 'user_permissions_view',
      display_name: 'View User Permissions',
      description: 'View permissions of users with lower permission levels',
      category: 'user_management',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'user_permissions_edit',
      display_name: 'Edit User Permissions',
      description: 'Edit permissions of users with lower permission levels',
      category: 'user_management', 
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  await knex('permissions').insert(newPermissions);
  
  // Add these permissions to Manager role
  const managerRole = await knex('roles').where('name', 'manager').first();
  const adminRole = await knex('roles').where('name', 'admin').first();
  
  if (managerRole) {
    const permissionIds = await knex('permissions')
      .whereIn('name', ['user_permissions_view', 'user_permissions_edit'])
      .select('id');
    
    const rolePermissions = permissionIds.map(p => ({
      role_id: managerRole.id,
      permission_id: p.id,
      created_at: new Date(),
      updated_at: new Date()
    }));
    
    await knex('role_permissions').insert(rolePermissions);
  }
  
  // Admin already has all permissions, so they get these automatically
  if (adminRole) {
    const permissionIds = await knex('permissions')
      .whereIn('name', ['user_permissions_view', 'user_permissions_edit'])
      .select('id');
    
    const rolePermissions = permissionIds.map(p => ({
      role_id: adminRole.id,
      permission_id: p.id,
      created_at: new Date(),
      updated_at: new Date()
    }));
    
    await knex('role_permissions').insert(rolePermissions);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function(knex) {
  // Remove role permissions first
  const permissionIds = await knex('permissions')
    .whereIn('name', ['user_permissions_view', 'user_permissions_edit'])
    .select('id')
    .then(rows => rows.map(row => row.id));
  
  await knex('role_permissions').whereIn('permission_id', permissionIds).del();
  
  // Remove permissions
  await knex('permissions')
    .whereIn('name', ['user_permissions_view', 'user_permissions_edit'])
    .del();
};
