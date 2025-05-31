/**
 * Centralized role hierarchy configuration
 * This ensures consistency between frontend and backend
 */

export const ROLE_HIERARCHY = {
  'admin': 1,
  'manager': 2,
  'customer': 3,
  'user': 4
};

export const ROLE_CONFIG = {
  /**
   * Get numerical level for role (lower = higher privilege)
   */
  getLevel(roleName) {
    return ROLE_HIERARCHY[roleName] || 999;
  },

  /**
   * Check if current user can assign target role
   * Rule: Can only assign strictly lower roles
   */
  canAssignRole(currentRole, targetRole) {
    return this.getLevel(currentRole) < this.getLevel(targetRole);
  },

  /**
   * Check if current user can manage target user
   * Rule: Can only manage users with strictly lower roles
   */
  canManageUser(currentRole, targetRole) {
    return this.getLevel(currentRole) < this.getLevel(targetRole);
  },

  /**
   * Get roles that current user can assign
   */
  getAssignableRoles(currentRole, allRoles) {
    const currentLevel = this.getLevel(currentRole);
    return allRoles.filter(role => this.getLevel(role.name) > currentLevel);
  },

  /**
   * Get default role for new users
   */
  getDefaultRole() {
    return 'customer';
  }
};