<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage user accounts and permissions
        </p>
      </div>
      
      <!-- Controls: Search, Filter, Create Button -->
      <div class="flex flex-col sm:flex-row gap-3">
        <!-- Search Input with Icon -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search users..."
            class="w-full sm:w-64 pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
            @input="debouncedSearch"
          />
        </div>

        <!-- Status Filter Dropdown -->
        <div class="relative">
          <select
            v-model="statusFilter"
            class="w-full sm:w-auto pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white appearance-none bg-white dark:bg-gray-700 transition-colors cursor-pointer"
            @change="loadUsers"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="blocked">Blocked</option>
          </select>
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <!-- Create User Button -->
        <CreateButton @click="showCreateUser = true">
          Create User
        </CreateButton>
      </div>
    </div>

    <!-- Users Table -->
    <BaseTable
      :data="users"
      :loading="loading"
      :error="error"
      loading-text="Loading users..."
      error-title="Failed to load users"
      @retry="loadUsers"
    >
      <template #header>
        <tr>
          <th 
            scope="col" 
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
            @click="sortBy('name')"
          >
            <div class="flex items-center space-x-1">
              <span>User</span>
              <ChevronDownIcon 
                v-if="sortField === 'name'" 
                :class="{ 'transform rotate-180': sortOrder === 'asc' }"
                class="w-4 h-4 transition-transform duration-200"
              />
            </div>
          </th>
          <th 
            scope="col" 
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
            @click="sortBy('email')"
          >
            <div class="flex items-center space-x-1">
              <span>Email</span>
              <ChevronDownIcon 
                v-if="sortField === 'email'" 
                :class="{ 'transform rotate-180': sortOrder === 'asc' }"
                class="w-4 h-4 transition-transform duration-200"
              />
            </div>
          </th>
          <th 
            scope="col" 
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
            @click="sortBy('role_name')"
          >
            <div class="flex items-center space-x-1">
              <span>Role</span>
              <ChevronDownIcon 
                v-if="sortField === 'role_name'" 
                :class="{ 'transform rotate-180': sortOrder === 'asc' }"
                class="w-4 h-4 transition-transform duration-200"
              />
            </div>
          </th>
          <th 
            scope="col" 
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
            @click="sortBy('status')"
          >
            <div class="flex items-center space-x-1">
              <span>Status</span>
              <ChevronDownIcon 
                v-if="sortField === 'status'" 
                :class="{ 'transform rotate-180': sortOrder === 'asc' }"
                class="w-4 h-4 transition-transform duration-200"
              />
            </div>
          </th>
          <th 
            scope="col" 
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
            @click="sortBy('created_at')"
          >
            <div class="flex items-center space-x-1">
              <span>Created</span>
              <ChevronDownIcon 
                v-if="sortField === 'created_at'" 
                :class="{ 'transform rotate-180': sortOrder === 'asc' }"
                class="w-4 h-4 transition-transform duration-200"
              />
            </div>
          </th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </template>

      <template #body>
        <tr 
          v-for="(user, index) in users" 
          :key="user.id"
          class="odd:bg-gray-50 odd:dark:bg-gray-700 even:bg-white even:dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <UserIcon :className="'w-8 h-8 text-gray-400 dark:text-gray-500 mr-3'" />
              <div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ user.name }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ user.username || 'No username' }}
                </div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
            {{ user.email }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <RoleBadge :role="user.role_name ? { name: user.role_name, display_name: user.role_display_name } : null" />
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <StatusBadge :status="user.status" />
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(user.created_at) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <div class="flex items-center space-x-2">
              <ActionButton
                variant="edit"
                title="Edit user"
                icon="EditIcon"
                @click="editUser(user)"
              />
              <ActionButton
                variant="impersonate"
                title="Impersonate user"
                icon="ImpersonateIcon"
                @click="impersonateUser(user)"
              />
              <ActionButton
                variant="delete"
                title="Delete user"
                icon="DeleteIcon"
                @click="deleteUser(user)"
              />
            </div>
          </td>
        </tr>
      </template>

      <template #empty>
        <UserIcon :className="'mx-auto h-12 w-12 text-gray-400 dark:text-gray-500'" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ emptyStateTitle }}</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ emptyStateMessage }}
        </p>
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
        >
          Clear filters
        </button>
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
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { api } from '../utils/api.js';
import StatusBadge from '../components/StatusBadge.vue';
import RoleBadge from '../components/RoleBadge.vue';
import UserIcon from '../components/icons/UserIcon.vue';
import SpinnerIcon from '../components/icons/SpinnerIcon.vue';
import EditIcon from '../components/icons/EditIcon.vue';
import DeleteIcon from '../components/icons/DeleteIcon.vue';
import ImpersonateIcon from '../components/icons/ImpersonateIcon.vue';
import TablePagination from '../components/TablePagination.vue';
import ActionButton from '../components/ActionButton.vue';
import BaseTable from '../components/BaseTable.vue';
import ChevronDownIcon from '../components/icons/ChevronDownIcon.vue';
import CreateButton from '../components/CreateButton.vue';

export default {
  name: 'Users',
  components: {
    StatusBadge,
    RoleBadge,
    UserIcon,
    SpinnerIcon,
    EditIcon,
    DeleteIcon,
    ImpersonateIcon,
    ActionButton,
    TablePagination,
    BaseTable,
    ChevronDownIcon,
    CreateButton
  },
  setup() {
    const users = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const pagination = ref(null);
    
    // Search and filters
    const searchQuery = ref('');
    const statusFilter = ref('');
    const perPage = ref(10);
    
    // Modal states
    const showCreateUser = ref(false);
    
    // Sorting
    const sortField = ref('created_at');
    const sortOrder = ref('desc');

    // Debounced search
    let searchTimeout = null;
    const debouncedSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadUsers();
      }, 300);
    };

    // Empty state logic
    const hasActiveFilters = computed(() => {
      return searchQuery.value.trim() || statusFilter.value;
    });

    const emptyStateTitle = computed(() => {
      if (hasActiveFilters.value) {
        return 'No users found';
      }
      return 'No users created yet';
    });

    const emptyStateMessage = computed(() => {
      if (searchQuery.value.trim() && statusFilter.value) {
        return `No users match your search "${searchQuery.value}" with status "${statusFilter.value}".`;
      } else if (searchQuery.value.trim()) {
        return `No users match your search "${searchQuery.value}".`;
      } else if (statusFilter.value) {
        return `No users found with status "${statusFilter.value}".`;
      }
      return 'Get started by creating your first user account.';
    });

    const clearFilters = () => {
      searchQuery.value = '';
      statusFilter.value = '';
      loadUsers();
    };

    const handlePerPageChange = (newPerPage) => {
      perPage.value = newPerPage;
      loadUsers(1); // Reset to page 1 when changing per page
    };

    const loadUsers = async (page = 1) => {
      loading.value = true;
      error.value = null;
      
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: perPage.value.toString(),
          sortBy: sortField.value,
          sortOrder: sortOrder.value
        });

        if (searchQuery.value.trim()) {
          params.append('search', searchQuery.value.trim());
        }

        if (statusFilter.value) {
          params.append('status', statusFilter.value);
        }

        const response = await api.get(`/users?${params}`);
        
        if (response.success) {
          users.value = response.data.users;
          pagination.value = response.data.pagination;
        } else {
          throw new Error(response.message || 'Failed to load users');
        }
      } catch (err) {
        console.error('Error loading users:', err);
        error.value = err.message || 'Failed to load users';
        users.value = [];
        pagination.value = null;
      } finally {
        loading.value = false;
      }
    };

    const sortBy = (field) => {
      if (sortField.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortField.value = field;
        sortOrder.value = 'asc';
      }
      loadUsers();
    };

    const changePage = (page) => {
      if (page >= 1 && page <= pagination.value.totalPages) {
        loadUsers(page);
      }
    };

    const getVisiblePages = () => {
      if (!pagination.value) return [];
      
      const current = pagination.value.page;
      const total = pagination.value.totalPages;
      const pages = [];
      
      if (total <= 7) {
        for (let i = 1; i <= total; i++) {
          pages.push(i);
        }
      } else {
        if (current <= 4) {
          for (let i = 1; i <= 5; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        } else if (current >= total - 3) {
          pages.push(1);
          pages.push('...');
          for (let i = total - 4; i <= total; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = current - 1; i <= current + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        }
      }
      
      return pages;
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const editUser = (user) => {
      console.log('Edit user:', user);
      // TODO: Implement edit functionality
    };

    const deleteUser = (user) => {
      console.log('Delete user:', user);
      // TODO: Implement delete functionality
    };

    const impersonateUser = (user) => {
      console.log('Impersonate user:', user);
      // TODO: Implement impersonate functionality
    };

    onMounted(() => {
      loadUsers();
    });

    return {
      users,
      loading,
      error,
      pagination,
      searchQuery,
      statusFilter,
      perPage,
      sortField,
      sortOrder,
      showCreateUser,
      hasActiveFilters,
      emptyStateTitle,
      emptyStateMessage,
      loadUsers,
      sortBy,
      changePage,
      handlePerPageChange,
      formatDate,
      debouncedSearch,
      clearFilters,
      editUser,
      deleteUser,
      impersonateUser
    };
  }
};
</script>