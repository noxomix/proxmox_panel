/**
 * User permissions management composable
 * Handles permission loading, role permissions, and permission updates
 */
import { ref, computed } from 'vue';
import { api } from '../utils/api.js';

export function useUserPermissions() {
  const permissions = ref([]);
  const selectedPermissions = ref({});
  const rolePermissions = ref({});
  const loading = ref(false);

  const permissionCategories = computed(() => {
    const categories = [...new Set(permissions.value.map(p => p.category).filter(Boolean))];
    return categories.sort();
  });

  const getPermissionsByCategory = (category) => {
    return permissions.value.filter(p => p.category === category);
  };

  const isPermissionFromRole = (permissionId) => {
    return !!rolePermissions.value[permissionId];
  };

  const updatePermission = (permissionId, value, isEditingSelf = false) => {
    // Don't allow changes when editing self
    if (isEditingSelf) return;
    
    // Don't allow unchecking role permissions
    if (!value && isPermissionFromRole(permissionId)) return;
    
    selectedPermissions.value = {
      ...selectedPermissions.value,
      [permissionId]: value
    };
  };

  const loadPermissions = async () => {
    try {
      const response = await api.get('/permissions/all');
      if (response.success) {
        permissions.value = response.data;
        
        // Initialize selectedPermissions
        const selected = {};
        permissions.value.forEach(permission => {
          selected[permission.id] = false;
        });
        selectedPermissions.value = selected;
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const loadRolePermissions = async (roleId) => {
    if (!roleId) {
      rolePermissions.value = {};
      return;
    }
    
    try {
      const response = await api.get(`/roles/${roleId}`);
      if (response.success && response.data.permissions) {
        const rolePerms = {};
        response.data.permissions.forEach(permission => {
          rolePerms[permission.id] = true;
        });
        rolePermissions.value = rolePerms;
        
        // Auto-select role permissions
        const newSelected = { ...selectedPermissions.value };
        response.data.permissions.forEach(permission => {
          newSelected[permission.id] = true;
        });
        selectedPermissions.value = newSelected;
      }
    } catch (error) {
      console.error('Failed to load role permissions:', error);
    }
  };

  const loadUserPermissions = async (userId) => {
    if (!userId) return;
    
    try {
      const response = await api.get(`/users/${userId}/permissions`);
      if (response.success) {
        // Create new object to trigger reactivity
        const newSelected = { ...selectedPermissions.value };
        
        // Mark all user permissions as selected
        response.data.permissions.forEach(permission => {
          if (newSelected.hasOwnProperty(permission.id)) {
            newSelected[permission.id] = true;
          }
        });
        
        // Track role permissions separately
        const rolePerms = {};
        response.data.rolePermissions.forEach(permission => {
          rolePerms[permission.id] = true;
        });
        rolePermissions.value = rolePerms;
        
        selectedPermissions.value = newSelected;
      }
    } catch (error) {
      console.error('Failed to load user permissions:', error);
    }
  };

  const updateUserPermissions = async (userId) => {
    try {
      const permissionIds = Object.keys(selectedPermissions.value)
        .filter(id => selectedPermissions.value[id]);
      
      const response = await api.put(`/users/${userId}/permissions`, {
        permissions: permissionIds
      });
      
      return response.success;
    } catch (error) {
      console.error('Failed to update permissions:', error);
      return false;
    }
  };

  const resetPermissions = () => {
    if (permissions.value.length > 0) {
      const selected = {};
      permissions.value.forEach(permission => {
        selected[permission.id] = false;
      });
      selectedPermissions.value = selected;
    }
    rolePermissions.value = {};
  };

  return {
    permissions,
    selectedPermissions,
    rolePermissions,
    loading,
    permissionCategories,
    getPermissionsByCategory,
    isPermissionFromRole,
    updatePermission,
    loadPermissions,
    loadRolePermissions,
    loadUserPermissions,
    updateUserPermissions,
    resetPermissions
  };
}