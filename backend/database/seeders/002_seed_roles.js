import { db } from '../../config/database.js';
import { roles, rolesNamespaces, permissions, rolePermissions } from '../schemas/index.js';
import { namespaces } from '../schemas/namespaces.js';
import { eq, inArray } from 'drizzle-orm';
import { generateId } from '../../utils/uuid.js';

export const seedRoles = async () => {
  console.log('🌱 Seeding roles...');
  
  try {
    // Get root namespace
    const rootNamespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.depth, 0))
      .limit(1);
    
    if (rootNamespace.length === 0) {
      throw new Error('Root namespace not found. Run namespace seed first.');
    }
    
    const rootNs = rootNamespace[0];
    
    // Clear existing data
    await db.delete(rolePermissions);
    await db.delete(rolesNamespaces);
    await db.delete(roles);
    
    const rolesToCreate = [
      {
        id: generateId(),
        name: 'admin',
        display_name: 'Administrator',
        namespace_id: rootNs.id,
        enabled: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'manager',
        display_name: 'Manager',
        namespace_id: rootNs.id,
        enabled: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'customer',
        display_name: 'Customer',
        namespace_id: rootNs.id,
        enabled: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    // Insert roles
    await db.insert(roles).values(rolesToCreate);
    
    // Make all roles available in root namespace
    const roleNamespaceAssignments = rolesToCreate.map(role => ({
      role_id: role.id,
      namespace_id: rootNs.id,
      created_at: new Date(),
      updated_at: new Date()
    }));
    
    await db.insert(rolesNamespaces).values(roleNamespaceAssignments);
    
    // Get all permissions for role assignments
    const allPermissions = await db.select().from(permissions);
    
    // Admin gets all permissions
    const adminPermissions = allPermissions.map(permission => ({
      role_id: rolesToCreate[0].id, // admin
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
    const managerPermissions = allPermissions
      .filter(permission => managerPermissionNames.includes(permission.name))
      .map(permission => ({
        role_id: rolesToCreate[1].id, // manager
        permission_id: permission.id,
        created_at: new Date(),
        updated_at: new Date()
      }));
    
    // Customer gets basic permissions (no user management)
    const customerPermissionNames = ['login', 'api_token_generate'];
    const customerPermissions = allPermissions
      .filter(permission => customerPermissionNames.includes(permission.name))
      .map(permission => ({
        role_id: rolesToCreate[2].id, // customer
        permission_id: permission.id,
        created_at: new Date(),
        updated_at: new Date()
      }));
    
    // Insert role permissions
    const allRolePermissions = [...adminPermissions, ...managerPermissions, ...customerPermissions];
    if (allRolePermissions.length > 0) {
      await db.insert(rolePermissions).values(allRolePermissions);
    }
    
    console.log('✅ Roles created:', rolesToCreate.map(r => r.name).join(', '));
    console.log('✅ Role permissions assigned');
    return rolesToCreate;
    
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  }
};