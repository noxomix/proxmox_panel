/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  await knex('role_permissions').del();
  await knex('roles').del();

  const roles = [
    {
      name: 'admin',
      display_name: 'Administrator',
      description: 'Full system administrator with all permissions',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'customer',
      display_name: 'Customer',
      description: 'Regular customer with basic access permissions',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  await knex('roles').insert(roles);

  const adminRole = await knex('roles').where('name', 'admin').first();
  const customerRole = await knex('roles').where('name', 'customer').first();
  const permissions = await knex('permissions').select('id', 'name');
  
  const adminPermissions = permissions.map(permission => ({
    role_id: adminRole.id,
    permission_id: permission.id,
    created_at: new Date(),
    updated_at: new Date()
  }));

  const customerPermissionNames = ['login', 'api_token_generate'];
  const customerPermissions = permissions
    .filter(permission => customerPermissionNames.includes(permission.name))
    .map(permission => ({
      role_id: customerRole.id,
      permission_id: permission.id,
      created_at: new Date(),
      updated_at: new Date()
    }));

  await knex('role_permissions').insert([...adminPermissions, ...customerPermissions]);
};