import User from '../models/User.js';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';

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

    // Actor must have ALL permissions that target has (proper superset)
    const actorPermissionIds = new Set(actorPermissions.map(p => p.id));
    const targetHasMorePermissions = targetPermissions.some(
      perm => !actorPermissionIds.has(perm.id)
    );

    return !targetHasMorePermissions;
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

      // Check if it's a proper subset (not equal)
      const isProperSubset = hasAllPermissions && 
        rolePermissions.length < userPermissions.length;

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