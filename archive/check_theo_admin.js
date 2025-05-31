// Script to check user 'theo' and admin role permissions
// Run with: node check_theo_admin.js

import knex from './src/db.js';

async function checkTheoAdmin() {
  try {
    console.log('=== Checking Theo User and Admin Role ===\n');

    // 1. Check if user 'theo' exists and has the admin role
    console.log('1. Checking if user "theo" exists and has admin role:');
    const theoUser = await knex('users')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .where('users.username', 'theo')
      .select(
        'users.id',
        'users.email',
        'users.username',
        'users.name',
        'users.role_id',
        'roles.name as role_name',
        'roles.display_name as role_display_name'
      )
      .first();

    if (theoUser) {
      console.log(`   ✓ User found:`);
      console.log(`     - ID: ${theoUser.id}`);
      console.log(`     - Username: ${theoUser.username}`);
      console.log(`     - Email: ${theoUser.email}`);
      console.log(`     - Name: ${theoUser.name}`);
      console.log(`     - Role: ${theoUser.role_name} (${theoUser.role_display_name})`);
    } else {
      console.log('   ✗ User "theo" not found');
    }

    console.log('\n2. Checking if admin role has "user_index" permission:');
    const adminUserIndexPerm = await knex('roles')
      .join('role_permissions', 'roles.id', 'role_permissions.role_id')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where('roles.name', 'admin')
      .where('permissions.name', 'user_index')
      .select(
        'roles.name as role_name',
        'permissions.name as permission_name',
        'permissions.display_name as permission_display_name'
      )
      .first();

    if (adminUserIndexPerm) {
      console.log(`   ✓ Admin role has "user_index" permission`);
      console.log(`     - Permission: ${adminUserIndexPerm.permission_display_name}`);
    } else {
      console.log('   ✗ Admin role does NOT have "user_index" permission');
    }

    console.log('\n3. All permissions for admin role:');
    const adminPermissions = await knex('roles')
      .join('role_permissions', 'roles.id', 'role_permissions.role_id')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .where('roles.name', 'admin')
      .select(
        'permissions.name as permission_name',
        'permissions.display_name as permission_display_name',
        'permissions.category as permission_category'
      )
      .orderBy('permissions.category')
      .orderBy('permissions.name');

    if (adminPermissions.length > 0) {
      // Group by category
      const permissionsByCategory = adminPermissions.reduce((acc, perm) => {
        const category = perm.permission_category || 'Other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(perm);
        return acc;
      }, {});

      Object.entries(permissionsByCategory).forEach(([category, perms]) => {
        console.log(`\n   ${category}:`);
        perms.forEach(perm => {
          console.log(`     - ${perm.permission_name} (${perm.permission_display_name})`);
        });
      });
      
      console.log(`\n   Total permissions: ${adminPermissions.length}`);
    } else {
      console.log('   ✗ No permissions found for admin role');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await knex.destroy();
  }
}

// Run the check
checkTheoAdmin();