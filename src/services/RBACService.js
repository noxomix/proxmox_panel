/**
 * Role-Based Access Control service
 * Centralizes all RBAC logic and validation
 */
import User from '../models/User.js';
import { Role } from '../models/Role.js';
import { ROLE_CONFIG } from '../config/roles.js';

export class RBACService {
  /**
   * Check if current user can manage target user
   */
  static async canUserManageTarget(currentUserId, targetUserId) {
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) return false;

    // Self-management is restricted for role/status changes
    if (currentUserId === targetUserId) return false;

    const currentRole = await User.getRole(currentUserId);
    const targetRole = await User.getRole(targetUserId);

    if (!currentRole || !targetRole) return false;

    return ROLE_CONFIG.canManageUser(currentRole.name, targetRole.name);
  }

  /**
   * Check if user can assign specific role
   */
  static async canAssignRole(currentUserId, targetRoleName) {
    const currentRole = await User.getRole(currentUserId);
    if (!currentRole) return false;

    return ROLE_CONFIG.canAssignRole(currentRole.name, targetRoleName);
  }

  /**
   * Get roles that current user can assign
   */
  static async getAssignableRoles(currentUserId) {
    const currentRole = await User.getRole(currentUserId);
    if (!currentRole) return [];

    const allRoles = await Role.findAll();
    return ROLE_CONFIG.getAssignableRoles(currentRole.name, allRoles);
  }

  /**
   * Validate that user can assign the given permissions
   */
  static async validatePermissionAssignment(currentUserId, permissionIds) {
    const userPermissions = await User.getPermissions(currentUserId);
    const userPermissionIds = userPermissions.map(p => p.id);

    const unauthorizedPermissions = permissionIds.filter(
      permId => !userPermissionIds.includes(permId)
    );

    if (unauthorizedPermissions.length > 0) {
      throw new Error('Cannot assign permissions you do not have');
    }

    return true;
  }

  /**
   * Validate that user permissions don't go below role permissions
   */
  static async validateUserPermissions(userId, requestedPermissionIds) {
    const user = await User.findById(userId);
    if (!user?.role_id) return true;

    const rolePermissions = await User.getRolePermissions(userId);
    const rolePermissionIds = rolePermissions.map(p => p.id);

    // Check if any role permissions are being removed
    const missingRolePermissions = rolePermissionIds.filter(
      rolePermId => !requestedPermissionIds.includes(rolePermId)
    );

    if (missingRolePermissions.length > 0) {
      throw new Error('Cannot remove permissions that are granted by the user\'s role');
    }

    return true;
  }

  /**
   * Check if user can delete target user
   */
  static async canDeleteUser(currentUserId, targetUserId) {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return false;

    // Can only delete disabled users
    if (targetUser.status !== 'disabled') return false;

    // Cannot delete self
    if (currentUserId === targetUserId) return false;

    // Check role hierarchy
    return await this.canUserManageTarget(currentUserId, targetUserId);
  }
}