<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-end items-center">
      <CreateButton @click="showCreateRole = true">
        Create Role
      </CreateButton>
    </div>

    <!-- Roles List -->
    <BaseTable
      :data="roles"
      :loading="loading"
      :error="error"
      loading-text="Loading roles..."
      error-title="Failed to load roles"
      @retry="loadRoles"
    >
      <template #header>
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
      </template>

      <template #body>
        <tr v-for="role in roles" :key="role.id" 
            class="odd:bg-gray-50 odd:dark:bg-gray-700 even:bg-white even:dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600">
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
      </template>

      <template #empty>
        <BriefcaseIcon class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No roles found</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create a role to get started.
        </p>
      </template>
    </BaseTable>

    <!-- Pagination -->
    <TablePagination
      v-if="pagination"
      :pagination="pagination"
      :per-page="perPage"
      @page-change="changePage"
      @per-page-change="handlePerPageChange"
    />

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
import TablePagination from '../components/TablePagination.vue';
import BaseTable from '../components/BaseTable.vue';
import CreateButton from '../components/CreateButton.vue';

export default {
  name: 'Roles',
  components: {
    SpinnerIcon,
    BriefcaseIcon,
    EditIcon,
    DeleteIcon,
    ActionButton,
    RoleModal,
    TablePagination,
    BaseTable,
    CreateButton
  },
  setup() {
    const roles = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const pagination = ref(null);
    const perPage = ref(10);
    const showCreateRole = ref(false);
    const editingRole = ref(null);

    const loadRoles = async (page = 1) => {
      loading.value = true;
      error.value = null;
      
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: perPage.value.toString()
        });

        const response = await api.get(`/roles?${params}`);
        
        if (response.success) {
          roles.value = response.data.data;
          pagination.value = response.data.pagination;
        } else {
          throw new Error(response.message || 'Failed to load roles');
        }
      } catch (err) {
        console.error('Error loading roles:', err);
        error.value = err.message || 'Failed to load roles';
        roles.value = [];
        pagination.value = null;
      } finally {
        loading.value = false;
      }
    };

    const changePage = (page) => {
      if (page !== pagination.value?.page) {
        loadRoles(page);
      }
    };

    const handlePerPageChange = (newPerPage) => {
      perPage.value = newPerPage;
      loadRoles(1); // Reset to page 1 when changing per page
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
      pagination,
      perPage,
      showCreateRole,
      editingRole,
      loadRoles,
      changePage,
      handlePerPageChange,
      handleRoleSaved,
      editRole,
      deleteRole,
      closeModal
    };
  }
};
</script>