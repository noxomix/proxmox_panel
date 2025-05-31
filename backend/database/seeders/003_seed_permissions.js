import { db } from '../../config/database.js';
import { permissions } from '../schemas/permissions.js';
import { generateId } from '../../utils/uuid.js';

export const seedPermissions = async () => {
  console.log('🌱 Seeding permissions...');
  
  try {
    // Clear existing permissions
    await db.delete(permissions);
    
    const permissionsToCreate = [
      // System permissions
      {
        id: generateId(),
        name: 'system_settings',
        display_name: 'System Settings',
        description: 'Can manage system-wide settings and configuration',
        category: 'system',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'login',
        display_name: 'Login Access',
        description: 'Allows user to login to the system',
        category: 'authentication',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'api_token_generate',
        display_name: 'Generate API Tokens',
        description: 'Allows user to generate API tokens in profile settings',
        category: 'authentication',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'user_index',
        display_name: 'Index Users',
        description: 'Allows user to view and search users',
        category: 'user_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'user_show',
        display_name: 'Show User',
        description: 'Allows user to view and manage other users',
        category: 'user_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'user_update',
        display_name: 'Update User',
        description: 'Allows user to update other users email/name when user has less permission than yourself',
        category: 'user_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'user_create',
        display_name: 'Create Users',
        description: 'Allows user to create new users which have less permission than yourself',
        category: 'user_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'user_delete',
        display_name: 'Delete Users',
        description: 'Allows user to delete other users which have less permission than yourself',
        category: 'user_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'user_role_assign',
        display_name: 'Assign User Roles',
        description: 'Can assign roles to users (still limited by permission hierarchy)',
        category: 'user_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'user_permissions_view',
        display_name: 'View User Permissions',
        description: 'Allows viewing permissions of users for dropdown/listing',
        category: 'user_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'user_permissions_edit',
        display_name: 'Edit User Permissions',
        description: 'Allows editing direct permissions of users which have less permission than yourself (you never can create a user of same permissions as yourself)',
        category: 'user_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'roles_list',
        display_name: 'List Roles',
        description: 'Allows viewing list of roles',
        category: 'user_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'roles_create',
        display_name: 'Create Roles',
        description: 'Allows creating new roles',
        category: 'role_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'roles_edit',
        display_name: 'Edit Roles',
        description: 'Allows editing existing roles',
        category: 'role_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'roles_delete',
        display_name: 'Delete Roles',
        description: 'Allows deleting roles',
        category: 'role_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'permissions_list',
        display_name: 'List Permissions',
        description: 'Allows viewing list of permissions',
        category: 'user_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'permissions_create',
        display_name: 'Create Permissions',
        description: 'Allows creating new permissions',
        category: 'role_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'permissions_edit',
        display_name: 'Edit Permissions',
        description: 'Allows editing existing permissions',
        category: 'role_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateId(),
        name: 'permissions_delete',
        display_name: 'Delete Permissions',
        description: 'Allows deleting permissions',
        category: 'role_management',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    // Insert permissions
    await db.insert(permissions).values(permissionsToCreate);
    
    console.log('✅ Permissions created:', permissionsToCreate.length);
    return permissionsToCreate;
    
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
};