<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Role Management</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage user roles and permissions
        </p>
      </div>
      <button
        @click="showCreateRole = true"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
      >
        Create Role
      </button>
    </div>

    <!-- Roles List -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="p-8 text-center">
        <SpinnerIcon class="animate-spin mx-auto h-8 w-8 text-gray-400" />
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading roles...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-8 text-center">
        <div class="text-red-600 dark:text-red-400">
          <p class="font-medium">Failed to load roles</p>
          <p class="text-sm mt-1">{{ error }}</p>
          <button
            @click="loadRoles"
            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Roles Table -->
      <div v-else-if="roles.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Permissions
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="role in roles" :key="role.id" 
                class="even:bg-gray-50 even:dark:bg-gray-700 odd:bg-white odd:dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <BriefcaseIcon class="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ role.display_name }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {{ role.name }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ role.description || 'No description' }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900 dark:text-white">
                  {{ role.permissions?.length || 0 }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="role.is_system ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  {{ role.is_system ? 'System' : 'Custom' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div v-if="!role.is_system" class="flex items-center space-x-2">
                  <ActionButton
                    variant="edit"
                    title="Edit role"
                    icon="EditIcon"
                    @click="editRole(role)"
                  />
                  <ActionButton
                    variant="delete"
                    title="Delete role"
                    icon="DeleteIcon"
                    @click="deleteRole(role)"
                  />
                </div>
                <div v-else class="text-xs text-gray-400 dark:text-gray-500">
                  System role
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="p-8 text-center">
        <BriefcaseIcon class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No roles found</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create a role to get started.
        </p>
      </div>
    </div>

    <!-- Role Modal -->
    <RoleModal
      :show="showCreateRole || !!editingRole"
      :role="editingRole"
      @close="closeModal"
      @saved="handleRoleSaved"
    />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { api } from '../utils/api.js';
import SpinnerIcon from '../components/icons/SpinnerIcon.vue';
import BriefcaseIcon from '../components/icons/BriefcaseIcon.vue';
import EditIcon from '../components/icons/EditIcon.vue';
import DeleteIcon from '../components/icons/DeleteIcon.vue';
import ActionButton from '../components/ActionButton.vue';
import RoleModal from '../components/RoleModal.vue';

export default {
  name: 'Roles',
  components: {
    SpinnerIcon,
    BriefcaseIcon,
    EditIcon,
    DeleteIcon,
    ActionButton,
    RoleModal
  },
  setup() {
    const roles = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const showCreateRole = ref(false);
    const editingRole = ref(null);

    const loadRoles = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        const response = await api.get('/roles');
        
        if (response.success) {
          roles.value = response.data.data;
        } else {
          throw new Error(response.message || 'Failed to load roles');
        }
      } catch (err) {
        console.error('Error loading roles:', err);
        error.value = err.message || 'Failed to load roles';
        roles.value = [];
      } finally {
        loading.value = false;
      }
    };

    const handleRoleSaved = async () => {
      await loadRoles();
    };

    const editRole = (role) => {
      editingRole.value = role;
    };

    const deleteRole = async (role) => {
      if (!confirm(`Are you sure you want to delete the role "${role.display_name}"?`)) {
        return;
      }

      try {
        const response = await api.delete(`/roles/${role.id}`);
        
        if (response.success) {
          await loadRoles();
        } else {
          throw new Error(response.message || 'Failed to delete role');
        }
      } catch (err) {
        console.error('Error deleting role:', err);
        alert(err.message || 'Failed to delete role');
      }
    };

    const closeModal = () => {
      showCreateRole.value = false;
      editingRole.value = null;
    };

    onMounted(() => {
      loadRoles();
    });

    return {
      roles,
      loading,
      error,
      showCreateRole,
      editingRole,
      loadRoles,
      handleRoleSaved,
      editRole,
      deleteRole,
      closeModal
    };
  }
};
</script>