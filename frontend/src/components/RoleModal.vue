<template>
  <ModalInterface
    :show="show"
    :title="isEditing ? 'Edit Role' : 'Create Role'"
    :subtitle="isEditing ? 'Modify role settings and permissions' : 'Create a new role with specific permissions'"
    size="xl"
    @close="handleClose"
  >
    <!-- Content -->
    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Role Name & Display Name (Side by Side) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Role Name *
          </label>
          <BaseInput
            v-model="form.name"
            type="text"
            placeholder="e.g., manager"
            :error="errors.name"
            :disabled="isEditing && role?.is_system"
            required
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Internal identifier
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Display Name *
          </label>
          <BaseInput
            v-model="form.display_name"
            type="text"
            placeholder="e.g., Manager"
            :error="errors.display_name"
            required
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Human-readable name
          </p>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          Description
        </label>
        <textarea
          v-model="form.description"
          rows="2"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors resize-none"
          :class="errors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''"
          placeholder="Describe what this role can do..."
        ></textarea>
        <p v-if="errors.description" class="mt-1 text-sm text-red-600 dark:text-red-400">
          {{ errors.description }}
        </p>
      </div>

      <!-- Permissions Section -->
      <div v-if="permissions.length > 0">
        <label class="block text-sm font-medium text-gray-900 dark:text-white mb-3">
          Permissions
        </label>
        
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
              />
            </div>
          </div>
        </div>
      </div>

      <!-- System Role Warning -->
      <div v-if="isEditing && role?.is_system" class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-amber-800 dark:text-amber-200">
              This is a system role. Some fields may be restricted to prevent system issues.
            </p>
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
          {{ isEditing ? 'Update Role' : 'Create Role' }}
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
import SpinnerIcon from './icons/SpinnerIcon.vue';

export default {
  name: 'RoleModal',
  components: {
    ModalInterface,
    BaseInput,
    BaseCheckbox,
    SpinnerIcon
  },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    role: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const loading = ref(false);
    const permissions = ref([]);
    const selectedPermissions = ref({});
    const errors = ref({});

    const form = ref({
      name: '',
      display_name: '',
      description: ''
    });

    const isEditing = computed(() => !!props.role);

    const isFormValid = computed(() => {
      return form.value.name.trim() && form.value.display_name.trim();
    });

    const permissionCategories = computed(() => {
      const categories = [...new Set(permissions.value.map(p => p.category).filter(Boolean))];
      return categories.sort();
    });

    const getPermissionsByCategory = (category) => {
      return permissions.value.filter(p => p.category === category);
    };

    const updatePermission = (permissionId, value) => {
      // Create a new object to ensure reactivity
      selectedPermissions.value = {
        ...selectedPermissions.value,
        [permissionId]: value
      };
    };

    const loadPermissions = async () => {
      try {
        const response = await api.get('/permissions');
        if (response.success) {
          permissions.value = response.data.data;
          
          // Initialize selectedPermissions
          const selected = {};
          permissions.value.forEach(permission => {
            selected[permission.id] = false;
          });
          
          selectedPermissions.value = selected;
          
          // If editing, load role permissions separately
          if (props.role?.id && isEditing.value) {
            await loadRolePermissions();
          }
        }
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }
    };

    const loadRolePermissions = async () => {
      if (!props.role?.id) return;
      
      try {
        const response = await api.get(`/roles/${props.role.id}`);
        if (response.success && response.data.permissions) {
          // Create new object to trigger reactivity
          const newSelected = { ...selectedPermissions.value };
          
          // Mark existing permissions as selected
          response.data.permissions.forEach(permission => {
            if (newSelected.hasOwnProperty(permission.id)) {
              newSelected[permission.id] = true;
            }
          });
          
          selectedPermissions.value = newSelected;
        }
      } catch (error) {
        console.error('Failed to load role permissions:', error);
      }
    };

    const resetForm = () => {
      form.value = {
        name: '',
        display_name: '',
        description: ''
      };
      errors.value = {};
      
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
      if (props.role) {
        form.value = {
          name: props.role.name || '',
          display_name: props.role.display_name || '',
          description: props.role.description || ''
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
          name: form.value.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          display_name: form.value.display_name,
          description: form.value.description || null
        };

        // Add selected permissions (always send the array, even if empty)
        const permissionIds = Object.keys(selectedPermissions.value)
          .filter(id => selectedPermissions.value[id]);
        
        data.permissions = permissionIds;

        let response;
        if (isEditing.value) {
          response = await api.put(`/roles/${props.role.id}`, data);
        } else {
          response = await api.post('/roles', data);
        }

        if (response.success) {
          emit('saved', response.data);
          handleClose();
        } else {
          if (response.errors) {
            errors.value = response.errors;
          } else {
            throw new Error(response.message || 'Failed to save role');
          }
        }
      } catch (error) {
        console.error('Error saving role:', error);
        errors.value = { general: error.message || 'Failed to save role' };
      } finally {
        loading.value = false;
      }
    };

    // Watch for modal visibility and role changes
    watch(() => [props.show, props.role], async ([show, role]) => {
      if (show) {
        await loadPermissions();
        populateForm();
        // Load role permissions after all permissions are loaded
        if (role?.id && isEditing.value) {
          await loadRolePermissions();
        }
      } else {
        resetForm();
      }
    }, { immediate: true, deep: true });

    onMounted(() => {
      if (props.show) {
        loadPermissions();
        populateForm();
      }
    });

    return {
      loading,
      permissions,
      selectedPermissions,
      errors,
      form,
      isEditing,
      isFormValid,
      permissionCategories,
      getPermissionsByCategory,
      updatePermission,
      handleClose,
      handleSubmit
    };
  }
};
</script>