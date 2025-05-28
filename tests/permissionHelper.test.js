import { describe, test, expect, beforeEach } from '@jest/globals';
import { PermissionHelper } from '../src/utils/permissionHelper.js';
import User from '../src/models/User.js';
import { Role } from '../src/models/Role.js';
import Permission from '../src/models/Permission.js';
import db from '../src/db.js';

describe('PermissionHelper Tests', () => {
  let adminUser, managerUser, customerUser, regularUser;
  let adminRole, managerRole, customerRole, userRole;

  beforeEach(async () => {
    // Get roles
    adminRole = await global.testUtils.getRoleByName('admin');
    managerRole = await global.testUtils.getRoleByName('manager');
    customerRole = await global.testUtils.getRoleByName('customer');
    userRole = await global.testUtils.getRoleByName('user');

    // Create test users
    adminUser = await global.testUtils.createTestUser({
      name: 'Admin User',
      email: 'admin@test.com',
      role_id: adminRole.id
    });

    managerUser = await global.testUtils.createTestUser({
      name: 'Manager User',
      email: 'manager@test.com',
      role_id: managerRole.id
    });

    customerUser = await global.testUtils.createTestUser({
      name: 'Customer User',
      email: 'customer@test.com',
      role_id: customerRole.id
    });

    regularUser = await global.testUtils.createTestUser({
      name: 'Regular User',
      email: 'regular@test.com',
      role_id: userRole.id
    });
  });

  describe('canManageUser', () => {
    test('user can always manage themselves', async () => {
      const canManage = await PermissionHelper.canManageUser(regularUser.id, regularUser.id);
      expect(canManage).toBe(true);
    });

    test('admin can manage manager', async () => {
      const canManage = await PermissionHelper.canManageUser(adminUser.id, managerUser.id);
      expect(canManage).toBe(true);
    });

    test('manager cannot manage admin', async () => {
      const canManage = await PermissionHelper.canManageUser(managerUser.id, adminUser.id);
      expect(canManage).toBe(false);
    });

    test('manager can manage customer', async () => {
      const canManage = await PermissionHelper.canManageUser(managerUser.id, customerUser.id);
      expect(canManage).toBe(true);
    });

    test('customer cannot manage manager', async () => {
      const canManage = await PermissionHelper.canManageUser(customerUser.id, managerUser.id);
      expect(canManage).toBe(false);
    });

    test('users with same permissions cannot manage each other', async () => {
      // Create another customer
      const anotherCustomer = await global.testUtils.createTestUser({
        email: 'customer2@test.com',
        role_id: customerRole.id
      });

      const canManage1 = await PermissionHelper.canManageUser(customerUser.id, anotherCustomer.id);
      const canManage2 = await PermissionHelper.canManageUser(anotherCustomer.id, customerUser.id);
      
      expect(canManage1).toBe(false);
      expect(canManage2).toBe(false);
    });

    test('user with direct permissions can be managed appropriately', async () => {
      // Give regular user an extra permission
      await global.testUtils.assignUserPermissions(regularUser.id, ['user_index']);

      // Manager should still be able to manage regular user (manager has more permissions)
      const canManage = await PermissionHelper.canManageUser(managerUser.id, regularUser.id);
      expect(canManage).toBe(true);

      // Customer cannot manage regular user with extra permission
      const cannotManage = await PermissionHelper.canManageUser(customerUser.id, regularUser.id);
      expect(cannotManage).toBe(false);
    });
  });

  describe('canAssignRole', () => {
    test('admin can assign manager role', async () => {
      const canAssign = await PermissionHelper.canAssignRole(adminUser.id, managerRole.id);
      expect(canAssign).toBe(true);
    });

    test('admin can assign customer role', async () => {
      const canAssign = await PermissionHelper.canAssignRole(adminUser.id, customerRole.id);
      expect(canAssign).toBe(true);
    });

    test('manager cannot assign admin role', async () => {
      const canAssign = await PermissionHelper.canAssignRole(managerUser.id, adminRole.id);
      expect(canAssign).toBe(false);
    });

    test('manager can assign customer role', async () => {
      const canAssign = await PermissionHelper.canAssignRole(managerUser.id, customerRole.id);
      expect(canAssign).toBe(true);
    });

    test('manager can assign user role', async () => {
      const canAssign = await PermissionHelper.canAssignRole(managerUser.id, userRole.id);
      expect(canAssign).toBe(true);
    });

    test('cannot assign role with same permissions', async () => {
      // Create a custom role with same permissions as customer
      const customerPermissions = await Role.getPermissions(customerRole.id);
      const customRole = await Role.create({
        name: 'custom_role',
        display_name: 'Custom Role',
        description: 'Test role'
      });
      await Role.syncPermissions(customRole.id, customerPermissions.map(p => p.id));

      // Customer cannot assign this role (same permissions)
      const canAssign = await PermissionHelper.canAssignRole(customerUser.id, customRole.id);
      expect(canAssign).toBe(false);
    });

    test('cannot assign own role', async () => {
      const canAssign = await PermissionHelper.canAssignRole(managerUser.id, managerRole.id);
      expect(canAssign).toBe(false);
    });
  });

  describe('getAssignableRoles', () => {
    test('admin can assign most roles', async () => {
      const assignableRoles = await PermissionHelper.getAssignableRoles(adminUser.id);
      const roleNames = assignableRoles.map(r => r.name);
      
      expect(roleNames).toContain('manager');
      expect(roleNames).toContain('customer');
      expect(roleNames).toContain('user');
      expect(roleNames).not.toContain('admin'); // Cannot assign own role
    });

    test('manager can assign limited roles', async () => {
      const assignableRoles = await PermissionHelper.getAssignableRoles(managerUser.id);
      const roleNames = assignableRoles.map(r => r.name);
      
      expect(roleNames).toContain('customer');
      expect(roleNames).toContain('user');
      expect(roleNames).not.toContain('admin');
      expect(roleNames).not.toContain('manager'); // Cannot assign own role
    });

    test('customer can assign minimal roles', async () => {
      const assignableRoles = await PermissionHelper.getAssignableRoles(customerUser.id);
      const roleNames = assignableRoles.map(r => r.name);
      
      expect(roleNames).toContain('user');
      expect(roleNames).not.toContain('admin');
      expect(roleNames).not.toContain('manager');
      expect(roleNames).not.toContain('customer'); // Cannot assign own role
    });

    test('regular user cannot assign any roles', async () => {
      const assignableRoles = await PermissionHelper.getAssignableRoles(regularUser.id);
      expect(assignableRoles).toHaveLength(0);
    });
  });

  describe('validatePermissionAssignment', () => {
    test('can assign permissions you have', async () => {
      const managerPermissions = await User.getPermissions(managerUser.id);
      const somePermissionIds = managerPermissions.slice(0, 3).map(p => p.id);

      const validation = await PermissionHelper.validatePermissionAssignment(
        managerUser.id, 
        somePermissionIds
      );
      
      expect(validation.valid).toBe(true);
    });

    test('cannot assign permissions you do not have', async () => {
      const adminOnlyPermission = await global.testUtils.getPermissionByName('roles_delete');
      
      const validation = await PermissionHelper.validatePermissionAssignment(
        managerUser.id,
        [adminOnlyPermission.id]
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('do not have');
    });

    test('cannot assign all your permissions', async () => {
      const managerPermissions = await User.getPermissions(managerUser.id);
      const allPermissionIds = managerPermissions.map(p => p.id);

      const validation = await PermissionHelper.validatePermissionAssignment(
        managerUser.id,
        allPermissionIds
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('equal or more');
    });

    test('can assign subset of permissions', async () => {
      const managerPermissions = await User.getPermissions(managerUser.id);
      // Take half of the permissions
      const subsetIds = managerPermissions.slice(0, Math.floor(managerPermissions.length / 2)).map(p => p.id);

      const validation = await PermissionHelper.validatePermissionAssignment(
        managerUser.id,
        subsetIds
      );
      
      expect(validation.valid).toBe(true);
    });
  });

  describe('hasPermission', () => {
    test('checks permission correctly', async () => {
      const hasLogin = await PermissionHelper.hasPermission(adminUser.id, 'login');
      expect(hasLogin).toBe(true);

      const hasInvalid = await PermissionHelper.hasPermission(regularUser.id, 'roles_delete');
      expect(hasInvalid).toBe(false);
    });
  });

  describe('getUserPermissionDetails', () => {
    test('returns detailed permission information', async () => {
      // Give manager a direct permission
      const extraPermission = await global.testUtils.getPermissionByName('permissions_list');
      await global.testUtils.assignUserPermissions(managerUser.id, ['permissions_list']);

      const details = await PermissionHelper.getUserPermissionDetails(managerUser.id);
      
      expect(details.all).toBeInstanceOf(Array);
      expect(details.role).toBeInstanceOf(Array);
      expect(details.direct).toBeInstanceOf(Array);

      // Check that permissions are marked with correct source
      const loginPerm = details.all.find(p => p.name === 'login');
      expect(loginPerm.source).toBe('role');

      const extraPerm = details.all.find(p => p.name === 'permissions_list');
      expect(extraPerm.source).toBe('direct');

      // Verify counts
      expect(details.all.length).toBe(details.role.length + details.direct.length);
    });

    test('handles user with no direct permissions', async () => {
      const details = await PermissionHelper.getUserPermissionDetails(customerUser.id);
      
      expect(details.direct).toHaveLength(0);
      expect(details.all.length).toBe(details.role.length);
      
      // All permissions should be from role
      details.all.forEach(perm => {
        expect(perm.source).toBe('role');
      });
    });
  });
});