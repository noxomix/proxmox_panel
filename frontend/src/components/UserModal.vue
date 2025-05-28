<template>
  <ModalInterface
    :show="show"
    :title="isEditing ? 'Edit User' : 'Create User'"
    :subtitle="isEditing ? 'Modify user settings, role and permissions' : 'Create a new user with role and permissions'"
    size="xl"
    @close="handleClose"
  >
    <!-- Content -->
    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- User Name & Email (Side by Side) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Name *
          </label>
          <BaseInput
            v-model="form.name"
            type="text"
            placeholder="e.g., John Doe"
            :error="errors.name"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Email *
          </label>
          <BaseInput
            v-model="form.email"
            type="email"
            placeholder="e.g., john@example.com"
            :error="errors.email"
            autocomplete="new-email"
            required
          />
        </div>
      </div>

      <!-- Password (only for create or when changing) -->
      <div v-if="!isEditing || showPasswordField">
        <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          {{ isEditing ? 'New Password' : 'Password' }} *
        </label>
        <PasswordInput
          v-model="form.password"
          :placeholder="isEditing ? 'Enter new password to change' : 'Enter password'"
          :error="errors.password"
          :required="!isEditing"
          autocomplete="new-password"
        />
        <button
          v-if="isEditing && !showPasswordField"
          type="button"
          @click="showPasswordField = true"
          class="mt-2 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
        >
          Change Password
        </button>
      </div>

      <!-- Role & Status (Side by Side) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Role
          </label>
          <select
            v-model="form.role_id"
            :disabled="isEditingSelf || !canAssignRoles || roleDropdownDisabled"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-colors"
            :class="[
              errors.role_id ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
              (isEditingSelf || !canAssignRoles || roleDropdownDisabled) ? 'opacity-60 cursor-not-allowed' : ''
            ]"
          >
            <option v-for="role in roles" :key="role.id" :value="role.id">
              {{ role.display_name || role.name }}
            </option>
          </select>
          <p v-if="isEditingSelf" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You cannot change your own role
          </p>
          <p v-else-if="errors.role_id" class="mt-1 text-sm text-red-600 dark:text-red-400">
            {{ errors.role_id }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Status
          </label>
          <select
            v-model="form.status"
            :disabled="isEditingSelf"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white transition-colors"
            :class="[
              errors.status ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
              isEditingSelf ? 'opacity-60 cursor-not-allowed' : ''
            ]"
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="blocked">Blocked</option>
          </select>
          <p v-if="isEditingSelf" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You cannot change your own status
          </p>
          <p v-else-if="errors.status" class="mt-1 text-sm text-red-600 dark:text-red-400">
            {{ errors.status }}
          </p>
        </div>
      </div>

      <!-- Permissions Section -->
      <div v-if="permissions.length > 0">
        <label class="block text-sm font-medium text-gray-900 dark:text-white mb-3">
          Permissions
        </label>
        
        <div v-if="form.role_id" class="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>{{ selectedRoleName }} Role:</strong> Some permissions are inherited from the selected role and cannot be removed. You can only add additional permissions.
          </p>
        </div>
        
        <div v-if="isEditingSelf" class="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p class="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> You cannot modify your own permissions. Contact an administrator if you need permission changes.
          </p>
        </div>
        
        <div v-if="!canEditUserPermissions && !isEditingSelf" class="mb-3 p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
          <p class="text-sm text-gray-800 dark:text-gray-200">
            <strong>Read-only:</strong> You can view permissions but cannot modify them. Contact an administrator if you need permission management access.
          </p>
        </div>
        
        <div class="space-y-4 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <!-- Group permissions by category -->
          <div v-for="category in permissionCategories" :key="category" class="space-y-3">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize border-b border-gray-200 dark:border-gray-700 pb-2">
              {{ category.replace('_', ' ') }}
            </h4>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <BaseCheckbox
                v-for="permission in getPermissionsByCategory(category)"
                :key="permission.id"
                :id="`permission-${permission.id}`"
                :modelValue="selectedPermissions[permission.id]"
                @update:modelValue="(value) => updatePermission(permission.id, value)"
                :label="permission.display_name"
                :help="permission.description"
                :disabled="isPermissionFromRole(permission.id) || isEditingSelf || !canEditUserPermissions"
                :class="(isPermissionFromRole(permission.id) || isEditingSelf || !canEditUserPermissions) ? 'opacity-60' : ''"
              />
            </div>
          </div>
          
          <!-- Uncategorized permissions -->
          <div v-if="getPermissionsByCategory(null).length > 0" class="space-y-3">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
              Other
            </h4>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <BaseCheckbox
                v-for="permission in getPermissionsByCategory(null)"
                :key="permission.id"
                :id="`permission-${permission.id}`"
                :modelValue="selectedPermissions[permission.id]"
                @update:modelValue="(value) => updatePermission(permission.id, value)"
                :label="permission.display_name"
                :help="permission.description"
                :disabled="isPermissionFromRole(permission.id) || isEditingSelf || !canEditUserPermissions"
                :class="(isPermissionFromRole(permission.id) || isEditingSelf || !canEditUserPermissions) ? 'opacity-60' : ''"
              />
            </div>
          </div>
        </div>
      </div>
    </form>

    <!-- Footer -->
    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="handleClose"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
        >
          Cancel
        </button>
        
        <button
          @click="handleSubmit"
          :disabled="!isFormValid || loading"
          class="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <SpinnerIcon v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
          {{ isEditing ? 'Update User' : 'Create User' }}
        </button>
      </div>
    </template>
  </ModalInterface>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import { api } from '../utils/api.js';
import ModalInterface from './ModalInterface.vue';
import BaseInput from './BaseInput.vue';
import BaseCheckbox from './BaseCheckbox.vue';
import PasswordInput from './PasswordInput.vue';
import SpinnerIcon from './icons/SpinnerIcon.vue';

export default {
  name: 'UserModal',
  components: {
    ModalInterface,
    BaseInput,
    BaseCheckbox,
    PasswordInput,
    SpinnerIcon
  },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    user: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const loading = ref(false);
    const permissions = ref([]);
    const roles = ref([]);
    const selectedPermissions = ref({});
    const rolePermissions = ref({});
    const errors = ref({});
    const showPasswordField = ref(false);

    const form = ref({
      name: '',
      email: '',
      password: '',
      role_id: '',
      status: 'active'
    });

    const isEditing = computed(() => !!props.user);

    const currentUser = ref(null);
    const currentUserPermissions = ref([]);
    const canAssignRoles = ref(false);
    const canViewUserPermissions = ref(false);
    const canEditUserPermissions = ref(false);
    const roleDropdownDisabled = ref(false);
    const permissionCheckResult = ref(null);
    
    const isEditingSelf = computed(() => {
      return isEditing.value && currentUser.value && props.user?.id === currentUser.value.id;
    });

    const isFormValid = computed(() => {
      const hasBasicInfo = form.value.name.trim() && form.value.email.trim();
      const hasPassword = isEditing.value ? true : form.value.password.trim();
      return hasBasicInfo && hasPassword;
    });

    const selectedRoleName = computed(() => {
      if (!form.value.role_id) return '';
      const role = roles.value.find(r => r.id === form.value.role_id);
      return role ? role.display_name : '';
    });

    const permissionCategories = computed(() => {
      const categories = [...new Set(permissions.value.map(p => p.category).filter(Boolean))];
      return categories.sort();
    });

    const isPermissionAvailable = (permissionId) => {
      // If editing self, all permissions are disabled
      if (isEditingSelf.value) return false;
      
      // If current user permissions not loaded yet, allow everything (to avoid blocking UI)
      if (!currentUserPermissions.value || currentUserPermissions.value.length === 0) {
        return true;
      }
      
      // Check if current user has this permission
      return currentUserPermissions.value.some(p => p.id === permissionId);
    };

    const getPermissionsByCategory = (category) => {
      if (category === null || category === undefined) {
        return permissions.value.filter(p => !p.category || p.category === '');
      }
      return permissions.value.filter(p => p.category === category);
    };

    const isPermissionFromRole = (permissionId) => {
      return !!rolePermissions.value[permissionId];
    };

    const updatePermission = (permissionId, value) => {
      // Don't allow changes when editing self
      if (isEditingSelf.value) {
        return;
      }
      
      // Don't allow unchecking role permissions
      if (!value && isPermissionFromRole(permissionId)) {
        return;
      }
      
      selectedPermissions.value = {
        ...selectedPermissions.value,
        [permissionId]: value
      };
    };

    const loadPermissions = async () => {
      try {
        const response = await api.get('/permissions/all');
        if (response.success) {
          permissions.value = response.data || [];
          
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

    const loadRoles = async () => {
      try {
        const response = await api.get('/roles/assignable');
        if (response.success) {
          roles.value = response.data.roles;
          
          // If editing self and current role is not in assignable roles, add it
          if (isEditingSelf.value && props.user?.role_id) {
            const hasCurrentRole = roles.value.some(role => role.id === props.user.role_id);
            if (!hasCurrentRole && props.user.role_name) {
              // Add current user's role to the dropdown for display
              roles.value.unshift({
                id: props.user.role_id,
                name: props.user.role_name,
                display_name: props.user.role_display_name || props.user.role_name
              });
            }
          }
          
          // Set customer as default role if available and not editing
          if (!isEditing.value && !form.value.role_id) {
            const customerRole = roles.value.find(role => role.name === 'customer');
            if (customerRole) {
              form.value.role_id = customerRole.id;
            }
          }
        }
      } catch (error) {
        console.error('Failed to load roles:', error);
      }
    };

    const loadCurrentUserPermissions = async () => {
      if (!currentUser.value?.id) return;
      
      try {
        const response = await api.get(`/users/${currentUser.value.id}/permissions`);
        if (response.success) {
          currentUserPermissions.value = response.data.permissions || [];
        }
      } catch (error) {
        console.error('Failed to load current user permissions:', error);
        currentUserPermissions.value = [];
      }
    };

    const checkUserEditPermissions = async () => {
      if (!isEditing.value || !props.user?.id) return;
      
      try {
        const response = await api.get(`/users/${props.user.id}/can-edit`);
        if (response.success) {
          permissionCheckResult.value = response.data;
          roleDropdownDisabled.value = response.data.has_more_permissions;
        }
      } catch (error) {
        console.error('Failed to check user edit permissions:', error);
        roleDropdownDisabled.value = false;
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

    const loadUserPermissions = async () => {
      if (!props.user?.id) return;
      
      try {
        const response = await api.get(`/users/${props.user.id}/permissions`);
        if (response.success) {
          // Store user's direct permissions
          userDirectPermissions.value = response.data.directPermissions.map(p => p.id);
          
          // Track role permissions separately
          const rolePerms = {};
          response.data.rolePermissions.forEach(permission => {
            rolePerms[permission.id] = true;
          });
          rolePermissions.value = rolePerms;
          
          // Create new object to trigger reactivity - only select direct permissions
          const newSelected = {};
          permissions.value.forEach(permission => {
            const isDirectPermission = userDirectPermissions.value.includes(permission.id);
            const isRolePermission = rolePerms[permission.id];
            
            // Show as checked if it's either a direct permission or role permission
            // But only count as "selected" (for form submission) if it's direct
            newSelected[permission.id] = isDirectPermission || isRolePermission;
          });
          
          selectedPermissions.value = newSelected;
        }
      } catch (error) {
        console.error('Failed to load user permissions:', error);
      }
    };

    const resetForm = () => {
      form.value = {
        name: '',
        email: '',
        password: '',
        role_id: '',
        status: 'active'
      };
      errors.value = {};
      showPasswordField.value = false;
      rolePermissions.value = {};
      
      // Reset selected permissions
      if (permissions.value.length > 0) {
        const selected = {};
        permissions.value.forEach(permission => {
          selected[permission.id] = false;
        });
        selectedPermissions.value = selected;
      }
    };

    const populateForm = () => {
      if (props.user) {
        form.value = {
          name: props.user.name || '',
          email: props.user.email || '',
          password: '',
          role_id: props.user.role_id || '',
          status: props.user.status || 'active'
        };
      }
    };

    const handleClose = () => {
      resetForm();
      emit('close');
    };

    const handleSubmit = async () => {
      if (!isFormValid.value) return;

      loading.value = true;
      errors.value = {};

      try {
        const data = {
          name: form.value.name,
          email: form.value.email
        };

        // Only add role and status if not editing self
        if (!isEditingSelf.value) {
          data.role_id = form.value.role_id || null;
          data.status = form.value.status;
        }

        // Add password if provided
        if (form.value.password || !isEditing.value) {
          data.password = form.value.password;
        }

        let response;
        if (isEditing.value) {
          response = await api.put(`/users/${props.user.id}`, data);
        } else {
          response = await api.post('/users', data);
        }

        if (response.success) {
          // Update permissions if editing (but not yourself)
          if (isEditing.value && !isEditingSelf.value) {
            // Only send direct permissions (exclude role permissions)
            const directPermissionIds = Object.keys(selectedPermissions.value)
              .filter(id => {
                const isSelected = selectedPermissions.value[id];
                const isFromCurrentRole = rolePermissions.value[id];
                
                // Include if selected AND not from current role
                // This ensures we only send actual direct permissions
                return isSelected && !isFromCurrentRole;
              });
            
            const permissionsResponse = await api.put(`/users/${props.user.id}/permissions`, {
              permissions: directPermissionIds
            });
            
            if (!permissionsResponse.success) {
              console.error('Failed to update permissions:', permissionsResponse);
            }
          } else if (!isEditing.value && Object.values(selectedPermissions.value).some(v => v)) {
            // Set permissions for new user if any are selected
            const permissionIds = Object.keys(selectedPermissions.value)
              .filter(id => selectedPermissions.value[id]);
            
            const permissionsResponse = await api.put(`/users/${response.data.user.id}/permissions`, {
              permissions: permissionIds
            });
            
            if (!permissionsResponse.success) {
              console.error('Failed to set permissions:', permissionsResponse);
            }
          }
          
          emit('saved', response.data);
          handleClose();
        } else {
          if (response.errors) {
            errors.value = response.errors;
          } else {
            throw new Error(response.message || 'Failed to save user');
          }
        }
      } catch (error) {
        console.error('Error saving user:', error);
        errors.value = { general: error.message || 'Failed to save user' };
      } finally {
        loading.value = false;
      }
    };

    // Watch for role changes to update permissions
    watch(() => form.value.role_id, async (newRoleId, oldRoleId) => {
      if (!newRoleId || newRoleId === oldRoleId) return;
      
      // Store direct permissions before loading new role
      const directPermissions = {};
      
      // If editing existing user, we need to preserve their actual direct permissions
      if (isEditing.value && props.user?.id) {
        // Get the user's actual direct permissions from the last load
        const userDirectPerms = await getUserDirectPermissions();
        userDirectPerms.forEach(permId => {
          directPermissions[permId] = true;
        });
      }
      
      // Reset all permissions to false first
      const resetSelected = {};
      permissions.value.forEach(permission => {
        resetSelected[permission.id] = false;
      });
      selectedPermissions.value = resetSelected;
      
      // Load new role permissions
      await loadRolePermissions(newRoleId);
      
      // Re-apply only the user's actual direct permissions
      Object.keys(directPermissions).forEach(permId => {
        selectedPermissions.value[permId] = true;
      });
    });
    
    // Helper to track user's actual direct permissions
    const userDirectPermissions = ref([]);
    const getUserDirectPermissions = () => {
      return userDirectPermissions.value;
    };

    const loadCurrentUser = async () => {
      try {
        const response = await api.get('/auth/profile');
        if (response.success) {
          currentUser.value = response.data.user;
          
          // Check if user has role assignment permission
          const permissionsResponse = await api.get(`/users/${response.data.user.id}/permissions`);
          if (permissionsResponse.success) {
            canAssignRoles.value = permissionsResponse.data.permissions.some(
              p => p.name === 'user_role_assign'
            );
            canViewUserPermissions.value = permissionsResponse.data.permissions.some(
              p => p.name === 'user_permissions_view'
            );
            canEditUserPermissions.value = permissionsResponse.data.permissions.some(
              p => p.name === 'user_permissions_edit'
            );
          }
        }
      } catch (error) {
        console.error('Failed to load current user:', error);
      }
    };

    // Watch for modal visibility and user changes
    watch(() => [props.show, props.user], async ([show, user]) => {
      if (show) {
        await Promise.all([loadPermissions(), loadRoles(), loadCurrentUser()]);
        populateForm();
        
        if (user?.id && isEditing.value) {
          await Promise.all([loadUserPermissions(), checkUserEditPermissions()]);
        } else if (form.value.role_id) {
          await loadRolePermissions(form.value.role_id);
        }
      } else {
        resetForm();
        roleDropdownDisabled.value = false;
        permissionCheckResult.value = null;
      }
    }, { immediate: true, deep: true });

    onMounted(async () => {
      if (props.show) {
        await Promise.all([loadPermissions(), loadRoles(), loadCurrentUser()]);
        await loadCurrentUserPermissions();
        populateForm();
      }
    });

    return {
      loading,
      permissions,
      roles,
      selectedPermissions,
      rolePermissions,
      errors,
      form,
      showPasswordField,
      isEditing,
      isFormValid,
      isEditingSelf,
      canAssignRoles,
      canViewUserPermissions,
      canEditUserPermissions,
      roleDropdownDisabled,
      permissionCheckResult,
      selectedRoleName,
      permissionCategories,
      getPermissionsByCategory,
      isPermissionFromRole,
      updatePermission,
      isPermissionAvailable,
      handleClose,
      handleSubmit
    };
  }
};
</script>