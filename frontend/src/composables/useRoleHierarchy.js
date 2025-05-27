/**
 * Role hierarchy utilities for frontend
 * Mirrors the backend role configuration
 */
import { ref, computed } from 'vue';
import { api } from '../utils/api.js';

// Role hierarchy levels (must match backend config)
const ROLE_HIERARCHY = {
  'admin': 1,
  'manager': 2,
  'customer': 3,
  'user': 4
};

export function useRoleHierarchy() {
  const currentUser = ref(null);

  const getRoleLevel = (roleName) => {
    return ROLE_HIERARCHY[roleName] || 999;
  };

  const canAssignRole = (currentRole, targetRole) => {
    return getRoleLevel(currentRole) < getRoleLevel(targetRole);
  };

  const canManageUser = (currentUserRole, targetUserRole) => {
    return getRoleLevel(currentUserRole) < getRoleLevel(targetUserRole);
  };

  const canEditUser = (user) => {
    if (!currentUser.value?.role_name) return false;
    return canManageUser(currentUser.value.role_name, user.role_name);
  };

  const canDeleteUser = (user) => {
    return user.status === 'disabled' && canEditUser(user);
  };

  const loadCurrentUser = async () => {
    try {
      const response = await api.get('/auth/profile');
      if (response.success) {
        currentUser.value = response.data.user;
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const isEditingSelf = computed(() => (user) => {
    return currentUser.value?.id === user?.id;
  });

  return {
    currentUser,
    getRoleLevel,
    canAssignRole,
    canManageUser,
    canEditUser,
    canDeleteUser,
    loadCurrentUser,
    isEditingSelf
  };
}