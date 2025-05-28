import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { app } from '../src/index.js';
import { db } from '../src/db.js';
import User from '../src/models/User.js';
import { Role } from '../src/models/Role.js';
import { Permission } from '../src/models/Permission.js';

describe('User Controller Tests', () => {
  let adminUser, managerUser, customerUser;
  let adminToken, managerToken, customerToken;
  let adminRole, managerRole, customerRole;
  
  beforeEach(async () => {
    // Get roles
    adminRole = await Role.findByName('admin');
    managerRole = await Role.findByName('manager');
    customerRole = await Role.findByName('customer');
    
    // Create test users
    adminUser = await global.testUtils.createTestUser({
      name: 'Admin User',
      email: 'admin@test.com',
      role_id: adminRole.id,
      status: 'active'
    });
    
    managerUser = await global.testUtils.createTestUser({
      name: 'Manager User', 
      email: 'manager@test.com',
      role_id: managerRole.id,
      status: 'active'
    });
    
    customerUser = await global.testUtils.createTestUser({
      name: 'Customer User',
      email: 'customer@test.com', 
      role_id: customerRole.id,
      status: 'active'
    });
    
    // Generate tokens
    adminToken = await global.testUtils.generateToken(adminUser);
    managerToken = await global.testUtils.generateToken(managerUser);
    customerToken = await global.testUtils.generateToken(customerUser);
  });
  
  afterEach(async () => {
    // Clean up any users created during tests
    await db('users').where('email', 'LIKE', '%@test.com').del();
    
    // Clean up test data
    if (adminUser?.id && managerUser?.id && customerUser?.id) {
      await db('user_permissions').whereIn('user_id', [adminUser.id, managerUser.id, customerUser.id]).del();
      await db('users').whereIn('id', [adminUser.id, managerUser.id, customerUser.id]).del();
    }
  });

  describe('User List & Permissions', () => {
    test('should list users based on permissions', async () => {
      // Admin can see all users
      const adminRes = await app.request('/api/users', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(adminRes.status).toBe(200);
      const adminData = await adminRes.json();
      expect(adminData.data.users.length).toBeGreaterThanOrEqual(3);
      
      // Customer cannot see users (no user_index permission)
      const customerRes = await app.request('/api/users', {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      expect(customerRes.status).toBe(403);
    });
    
    test('should respect permission hierarchy when viewing user details', async () => {
      // Admin can view customer
      const adminViewRes = await app.request(`/api/users/${customerUser.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(adminViewRes.status).toBe(200);
      
      // Customer cannot view admin (no permission)
      const customerViewRes = await app.request(`/api/users/${adminUser.id}`, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      expect(customerViewRes.status).toBe(403);
    });
  });

  describe('User Creation with Role Assignment', () => {
    test('should create user with valid role assignment', async () => {
      // Admin can create user with customer role
      const res = await app.request('/api/users', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          role_id: customerRole.id,
          status: 'active'
        })
      });
      
      expect(res.status).toBe(201);
      const data = await res.json();
      
      // Debug: log the response if it's not what we expect
      if (data.data?.user?.email !== 'newuser@test.com') {
        console.log('Create user response:', JSON.stringify(data, null, 2));
      }
      
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('newuser@test.com');
      expect(data.data.user.name).toBe('New User');
      
      // Clean up created user
      if (data.data?.user?.id) {
        await db('users').where('id', data.data.user.id).del();
      }
    });
    
    test('should fail when assigning role with more permissions than actor', async () => {
      // Manager cannot create user with admin role
      const res = await app.request('/api/users', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'New Admin',
          email: 'newadmin@test.com',
          password: 'SecurePass123!',
          role_id: adminRole.id,
          status: 'active'
        })
      });
      
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.errors.role_id).toContain('You cannot assign a role with permissions you do not have');
    });
  });

  describe('User Update - Role & Status Changes', () => {
    test('should prevent self role/status changes', async () => {
      // Admin tries to change own role
      const res = await app.request(`/api/users/${adminUser.id}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: adminUser.name,
          email: adminUser.email,
          role_id: managerRole.id,
          status: 'disabled'
        })
      });
      
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toBe('Cannot change your own role or status');
    });
    
    test('should allow self profile updates (name, email, password only)', async () => {
      // Admin updates own profile
      const res = await app.request(`/api/users/${adminUser.id}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Updated Admin Name',
          email: 'updated.admin@test.com'
        })
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.user.name).toBe('Updated Admin Name');
      expect(data.data.user.email).toBe('updated.admin@test.com');
    });
    
    test('should prevent updating user with more permissions', async () => {
      // Manager tries to update admin
      const res = await app.request(`/api/users/${adminUser.id}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Hacked Admin',
          status: 'disabled'
        })
      });
      
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toBe('You cannot edit users with more permissions than your own');
    });
    
    test('should prevent updating user with equal permissions', async () => {
      // Create another manager
      const manager2 = await global.testUtils.createTestUser({
        name: 'Manager 2',
        email: 'manager2@test.com',
        role_id: managerRole.id,
        status: 'active'
      });
      
      // Manager tries to update another manager
      const res = await app.request(`/api/users/${manager2.id}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'disabled'
        })
      });
      
      expect(res.status).toBe(403);
      
      // Cleanup
      await db('users').where('id', manager2.id).del();
    });
  });

  describe('Permission Assignment', () => {
    test('should prevent assigning more permissions than actor has', async () => {
      // Get all admin permissions
      const adminPerms = await User.getPermissions(adminUser.id);
      const adminPermIds = adminPerms.map(p => p.id);
      
      // Manager tries to give customer all admin permissions
      const res = await app.request(`/api/users/${customerUser.id}/permissions`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: adminPermIds
        })
      });
      
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.errors.permissions).toContain('You cannot assign permissions you do not have');
    });
    
    test('should prevent assigning permission actor doesn\'t have', async () => {
      // Get a permission that manager doesn't have
      const adminOnlyPerm = await Permission.findByName('system_settings');
      
      // Manager tries to give customer an admin-only permission
      const res = await app.request(`/api/users/${customerUser.id}/permissions`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: [adminOnlyPerm.id]
        })
      });
      
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.errors.permissions).toContain('You cannot assign permissions you do not have');
    });
    
    test('should prevent total permissions from equaling or exceeding actor\'s', async () => {
      // Get manager's permissions
      const managerPerms = await User.getPermissions(managerUser.id);
      
      // Calculate how many permissions we can add to customer
      const customerRolePerms = await User.getRolePermissions(customerUser.id);
      const maxAdditionalPerms = managerPerms.length - customerRolePerms.length - 1;
      
      // Try to add exactly enough permissions to equal manager's total
      const permsToAdd = managerPerms
        .filter(p => !customerRolePerms.some(cp => cp.id === p.id))
        .slice(0, maxAdditionalPerms + 1) // One too many
        .map(p => p.id);
      
      const res = await app.request(`/api/users/${customerUser.id}/permissions`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: permsToAdd
        })
      });
      
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.errors.permissions).toContain('The resulting permissions would equal or exceed your own permissions');
    });
    
    test('should allow valid permission assignment within limits', async () => {
      // Admin gives customer one additional permission they can have
      const userIndexPerm = await Permission.findByName('user_index');
      
      const res = await app.request(`/api/users/${customerUser.id}/permissions`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permissions: [userIndexPerm.id]
        })
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      
      // Verify the permission was added
      const updatedPerms = await User.getDirectPermissions(customerUser.id);
      expect(updatedPerms.some(p => p.id === userIndexPerm.id)).toBe(true);
    });
  });

  describe('User Deletion', () => {
    test('should prevent deleting user with more permissions', async () => {
      // Manager tries to delete admin
      const res = await app.request(`/api/users/${adminUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${managerToken}` }
      });
      
      expect(res.status).toBe(403);
    });
    
    test('should prevent self-deletion', async () => {
      // Admin tries to delete self
      const res = await app.request(`/api/users/${adminUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toBe('Cannot delete your own account');
    });
    
    test('should allow deleting user with fewer permissions', async () => {
      // Create a new user to delete (to ensure it exists)
      const userToDelete = await global.testUtils.createTestUser({
        name: 'User To Delete',
        email: 'delete.me@test.com',
        role_id: customerRole.id,
        status: 'disabled'  // User must be disabled to be deleted
      });
      
      // Admin deletes the user
      const res = await app.request(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      expect(res.status).toBe(200);
      
      // Verify user is deleted
      const deletedUser = await User.findById(userToDelete.id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Assignable Roles Endpoint', () => {
    test('should return only roles that can be assigned by actor', async () => {
      // Manager checks assignable roles
      const res = await app.request('/api/roles/assignable', {
        headers: { Authorization: `Bearer ${managerToken}` }
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      
      // Manager should be able to assign customer and user roles (both have fewer permissions)
      expect(data.data.roles.length).toBe(2);
      
      const roleNames = data.data.roles.map(r => r.name);
      expect(roleNames).toContain('customer');
      expect(roleNames).toContain('user');
      
      // Should not include admin or manager roles
      expect(data.data.roles.some(r => r.name === 'admin')).toBe(false);
      expect(data.data.roles.some(r => r.name === 'manager')).toBe(false);
    });
  });

  describe('Can Edit Check Endpoint', () => {
    test('should correctly identify edit capabilities', async () => {
      // Admin checks if can edit customer
      const res = await app.request(`/api/users/${customerUser.id}/can-edit`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.can_edit).toBe(true);
      expect(data.data.has_more_permissions).toBe(false);
    });
    
    test('should prevent edit when target has more permissions', async () => {
      // Manager checks if can edit admin (manager has user_permissions_view)
      const res = await app.request(`/api/users/${adminUser.id}/can-edit`, {
        headers: { Authorization: `Bearer ${managerToken}` }
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.can_edit).toBe(false);
      expect(data.data.has_more_permissions).toBe(true);
    });
  });
});