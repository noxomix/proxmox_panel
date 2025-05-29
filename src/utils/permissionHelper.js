import User from '../models/User.js';
import UserNamespaceRole from '../models/UserNamespaceRole.js';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import db from '../db.js';

export class PermissionHelper {
  /**
   * Check if one user can manage another user based on permission hierarchy
   * @param {string} actorUserId - The user performing the action
   * @param {string} targetUserId - The user being acted upon
   * @returns {Promise<boolean>}
   */
  static async canManageUser(actorUserId, targetUserId) {
    // Users can always edit themselves (limited fields only)
    if (actorUserId === targetUserId) {
      return true;
    }

    // Get effective permissions for both users
    const actorPermissions = await User.getPermissions(actorUserId);
    const targetPermissions = await User.getPermissions(targetUserId);

    // Actor must have ALL permissions that target has AND more (proper superset)
    const actorPermissionIds = new Set(actorPermissions.map(p => p.id));
    const targetPermissionIds = new Set(targetPermissions.map(p => p.id));
    
    // Check if actor has all target permissions
    const hasAllTargetPermissions = targetPermissions.every(
      perm => actorPermissionIds.has(perm.id)
    );
    
    // Check if actor has strictly more permissions (proper superset)
    const hasMorePermissions = actorPermissions.length > targetPermissions.length;
    
    return hasAllTargetPermissions && hasMorePermissions;
  }

  /**
   * Check if a user can assign a specific role to another user
   * @param {string} actorUserId - The user assigning the role
   * @param {string} roleId - The role to be assigned
   * @returns {Promise<boolean>}
   */
  static async canAssignRole(actorUserId, roleId) {
    // Get actor's effective permissions
    const actorPermissions = await User.getPermissions(actorUserId);
    const actorPermissionIds = new Set(actorPermissions.map(p => p.id));

    // Get the role's permissions
    const role = await Role.findById(roleId);
    if (!role) {
      return false;
    }

    const rolePermissions = await Role.getPermissions(role.id);
    
    // Actor must have ALL permissions that the role grants
    const hasAllRolePermissions = rolePermissions.every(
      perm => actorPermissionIds.has(perm.id)
    );

    // Additionally, the role must be a proper subset (not equal)
    const isProperSubset = hasAllRolePermissions && 
      rolePermissions.length < actorPermissions.length;

    return isProperSubset;
  }

  /**
   * Get roles that a user can assign to others
   * @param {string} userId - The user who wants to assign roles
   * @returns {Promise<Array>} List of assignable roles
   */
  static async getAssignableRoles(userId) {
    // Get user's effective permissions
    const userPermissions = await User.getPermissions(userId);
    const userPermissionIds = new Set(userPermissions.map(p => p.id));

    // Get all roles
    const allRoles = await Role.findAll();

    // Filter roles that user can assign
    const assignableRoles = [];
    
    for (const role of allRoles) {
      const rolePermissions = await Role.getPermissions(role.id);
      
      // Check if user has all permissions of this role
      const hasAllPermissions = rolePermissions.every(
        perm => userPermissionIds.has(perm.id)
      );

      // Must be proper subset: user has all role permissions AND more
      // This prevents admin from assigning admin role to others
      const isProperSubset = hasAllPermissions && 
        userPermissions.length > rolePermissions.length;

      if (isProperSubset) {
        assignableRoles.push({
          id: role.id,
          name: role.name,
          display_name: role.display_name,
          description: role.description,
          permission_count: rolePermissions.length
        });
      }
    }

    return assignableRoles;
  }

  /**
   * Namespace-aware version: Check if one user can manage another user in a specific namespace
   * @param {string} actorUserId - The user performing the action
   * @param {string} targetUserId - The user being acted upon
   * @param {string} namespaceId - The namespace context
   * @returns {Promise<boolean>}
   */
  static async canManageUserInNamespace(actorUserId, targetUserId, namespaceId) {
    // Users can always edit themselves (limited fields only)
    if (actorUserId === targetUserId) {
      return true;
    }

    // Get permissions for both users in this namespace
    const actorRole = await UserNamespaceRole.getRoleForUser(actorUserId, namespaceId);
    const targetRole = await UserNamespaceRole.getRoleForUser(targetUserId, namespaceId);

    if (!actorRole || !targetRole) {
      return false; // One or both users don't exist in this namespace
    }

    // Get permissions for both roles
    const actorPermissions = await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', actorRole.id)
      .select('permissions.*');

    const targetPermissions = await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', targetRole.id)
      .select('permissions.*');

    // Actor must have ALL permissions that target has (proper superset)
    const actorPermissionIds = new Set(actorPermissions.map(p => p.id));
    
    // Check if target permissions are a proper subset of actor permissions
    const hasAllTargetPermissions = targetPermissions.every(
      perm => actorPermissionIds.has(perm.id)
    );
    
    // Must be proper superset: actor has all target permissions AND more
    // OR target has fewer permissions (proper subset)
    const isProperSuperset = hasAllTargetPermissions && 
      actorPermissions.length > targetPermissions.length;

    return isProperSuperset;
  }

  /**
   * Namespace-aware version: Check if a user can assign a specific role in a namespace
   * @param {string} actorUserId - The user assigning the role
   * @param {string} roleId - The role to be assigned
   * @param {string} namespaceId - The namespace context
   * @returns {Promise<boolean>}
   */
  static async canAssignRoleInNamespace(actorUserId, roleId, namespaceId) {
    // Get actor's role and permissions in namespace
    const actorRole = await UserNamespaceRole.getRoleForUser(actorUserId, namespaceId);
    if (!actorRole) {
      return false;
    }

    // Get actor's permissions
    const actorPermissions = await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', actorRole.id)
      .select('permissions.*');

    // Get target role's permissions
    const targetRolePermissions = await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', roleId)
      .select('permissions.*');

    // Actor must have all permissions of the role they're trying to assign
    const actorPermissionIds = new Set(actorPermissions.map(p => p.id));
    
    const hasAllRolePermissions = targetRolePermissions.every(
      perm => actorPermissionIds.has(perm.id)
    );

    // Must be proper superset: actor has all role permissions AND more
    // This prevents admin from assigning admin role to others
    const isProperSuperset = hasAllRolePermissions && 
      actorPermissions.length > targetRolePermissions.length;

    return isProperSuperset;
  }

  /**
   * Get assignable roles for a user in a specific namespace
   * @param {string} userId - The user who would assign roles
   * @param {string} namespaceId - The namespace context
   * @returns {Promise<Array>}
   */
  static async getAssignableRolesInNamespace(userId, namespaceId) {
    // Get user's role and permissions in namespace
    const userRole = await UserNamespaceRole.getRoleForUser(userId, namespaceId);
    if (!userRole) {
      return [];
    }

    const userPermissions = await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', userRole.id)
      .select('permissions.*');

    const userPermissionIds = new Set(userPermissions.map(p => p.id));

    // Get all available roles in this namespace
    const availableRoles = await Role.getAvailableInNamespace(namespaceId);

    // Filter roles that user can assign
    const assignableRoles = [];
    
    for (const role of availableRoles) {
      const rolePermissions = await db('permissions')
        .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
        .where('role_permissions.role_id', role.id)
        .select('permissions.*');
      
      // Check if user has all permissions of this role
      const hasAllPermissions = rolePermissions.every(
        perm => userPermissionIds.has(perm.id)
      );

      // Must be proper subset: user has all role permissions AND more
      // This prevents admin from assigning admin role to others
      const isProperSubset = hasAllPermissions && 
        userPermissions.length > rolePermissions.length;

      if (isProperSubset) {
        assignableRoles.push({
          id: role.id,
          name: role.name,
          display_name: role.display_name,
          description: role.description,
          permission_count: rolePermissions.length,
          origin_namespace_id: role.origin_namespace_id,
          origin_namespace_name: role.origin_namespace_name
        });
      }
    }

    return assignableRoles;
  }

  /**
   * Validate if a user can assign specific permissions to another
   * @param {string} actorUserId - The user assigning permissions
   * @param {Array<string>} permissionIds - Permission IDs to assign
   * @returns {Promise<{valid: boolean, message?: string}>}
   */
  static async validatePermissionAssignment(actorUserId, permissionIds) {
    // Get actor's effective permissions
    const actorPermissions = await User.getPermissions(actorUserId);
    const actorPermissionIds = new Set(actorPermissions.map(p => p.id));

    // Check if actor has all permissions they're trying to assign
    const invalidPermissions = permissionIds.filter(
      permId => !actorPermissionIds.has(permId)
    );

    if (invalidPermissions.length > 0) {
      return {
        valid: false,
        message: 'You cannot assign permissions you do not have'
      };
    }

    // Ensure assigned permissions are a proper subset
    if (permissionIds.length >= actorPermissions.length) {
      return {
        valid: false,
        message: 'You cannot assign equal or more permissions than you have'
      };
    }

    return { valid: true };
  }

  /**
   * Check if user has specific permission
   * @param {string} userId 
   * @param {string} permissionName 
   * @returns {Promise<boolean>}
   */
  static async hasPermission(userId, permissionName) {
    return User.hasPermission(userId, permissionName);
  }

  /**
   * Get all permissions with details about source (role or direct)
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  static async getUserPermissionDetails(userId) {
    const allPermissions = await User.getPermissions(userId);
    const rolePermissions = await User.getRolePermissions(userId);
    const directPermissions = await User.getDirectPermissions(userId);
    
    const rolePermissionIds = new Set(rolePermissions.map(p => p.id));
    
    // Mark each permission with its source
    const permissionsWithSource = allPermissions.map(perm => ({
      ...perm,
      source: rolePermissionIds.has(perm.id) ? 'role' : 'direct'
    }));

    return {
      all: permissionsWithSource,
      role: rolePermissions,
      direct: directPermissions
    };
  }
}