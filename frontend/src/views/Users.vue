<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage user accounts and permissions
        </p>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Search Input -->
        <div>
          <label for="search" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search Users
          </label>
          <input
            id="search"
            v-model="searchQuery"
            type="text"
            placeholder="Search by name, email, or username..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            @input="debouncedSearch"
          />
        </div>

        <!-- Status Filter -->
        <div>
          <label for="status-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Status
          </label>
          <select
            id="status-filter"
            v-model="statusFilter"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            @change="loadUsers"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-gray-500 dark:text-gray-400">
          <SpinnerIcon class="animate-spin -ml-1 mr-3 h-5 w-5" />
          Loading users...
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-8 text-center">
        <div class="text-red-600 dark:text-red-400">
          <p class="font-medium">Failed to load users</p>
          <p class="text-sm mt-1">{{ error }}</p>
          <button
            @click="loadUsers"
            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Users Table -->
      <div v-else-if="users.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th 
                scope="col" 
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                @click="sortBy('id')"
              >
                <div class="flex items-center space-x-1">
                  <span>ID</span>
                  <ChevronDownIcon 
                    v-if="sortField === 'id'" 
                    :class="{ 'transform rotate-180': sortOrder === 'asc' }"
                    class="w-4 h-4 transition-transform duration-200"
                  />
                </div>
              </th>
              <th 
                scope="col" 
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                @click="sortBy('name')"
              >
                <div class="flex items-center space-x-1">
                  <span>Name</span>
                  <ChevronDownIcon 
                    v-if="sortField === 'name'" 
                    :class="{ 'transform rotate-180': sortOrder === 'asc' }"
                    class="w-4 h-4 transition-transform duration-200"
                  />
                </div>
              </th>
              <th 
                scope="col" 
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
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
              <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th 
                scope="col" 
                class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
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
              <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr 
              v-for="(user, index) in users" 
              :key="user.id"
              :class="[
                'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150',
                index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
              ]"
            >
              <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {{ user.id.slice(0, 8) }}...
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center">
                  <UserIcon :className="'w-6 h-6 text-gray-400 dark:text-gray-500 mr-2'" />
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ user.name }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ user.email }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <RoleBadge :role="user.role_name || user.role_display_name ? { name: user.role_name, display_name: user.role_display_name } : null" />
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <StatusBadge :status="user.status" />
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(user.created_at) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="p-8 text-center">
        <UserIcon :className="'mx-auto h-12 w-12 text-gray-400 dark:text-gray-500'" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ searchQuery ? 'Try adjusting your search criteria.' : 'No users have been created yet.' }}
        </p>
      </div>

      <!-- Pagination -->
      <div v-if="pagination" class="bg-white dark:bg-gray-800 px-4 py-4 mt-2 border-t border-gray-200 dark:border-gray-700 sm:px-6">
        <div class="flex items-center justify-between">
          <!-- Left side: Results info -->
          <div class="flex items-center space-x-4">
            <p class="text-sm text-gray-700 dark:text-gray-300">
              Showing
              <span class="font-medium">{{ (pagination.page - 1) * pagination.limit + 1 }}</span>
              to
              <span class="font-medium">{{ Math.min(pagination.page * pagination.limit, pagination.total) }}</span>
              of
              <span class="font-medium">{{ pagination.total }}</span>
              results
            </p>
          </div>
          
          <!-- Center: Page navigation -->
          <div class="flex items-center">
            <!-- Previous page arrow -->
            <button
              :disabled="!pagination.hasPrev"
              @click="changePage(pagination.page - 1)"
              :class="{
                'opacity-40 cursor-not-allowed': !pagination.hasPrev,
                'hover:bg-gray-50 dark:hover:bg-gray-700': pagination.hasPrev
              }"
              class="px-2 py-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border-t border-b border-l border-gray-300 dark:border-gray-600 rounded-l-lg transition-colors duration-150"
            >
              <ChevronDownIcon class="h-4 w-4 transform rotate-90" />
            </button>
            
            <!-- Page numbers -->
            <div class="flex">
              <template v-for="page in getVisiblePages()" :key="page">
                <button
                  v-if="page !== '...'"
                  @click="changePage(page)"
                  :class="{
                    'bg-slate-600 text-white border-slate-600 shadow-sm dark:bg-slate-600 dark:border-slate-600': page === pagination.page,
                    'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700': page !== pagination.page
                  }"
                  class="px-3 py-1.5 text-sm font-medium border-t border-b border-r -ml-px transition-colors duration-150 min-w-[40px]"
                >
                  {{ page }}
                </button>
                <span v-else class="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border-t border-b border-r -ml-px">
                  ...
                </span>
              </template>
            </div>
            
            <!-- Next page arrow -->
            <button
              :disabled="!pagination.hasNext"
              @click="changePage(pagination.page + 1)"
              :class="{
                'opacity-40 cursor-not-allowed': !pagination.hasNext,
                'hover:bg-gray-50 dark:hover:bg-gray-700': pagination.hasNext
              }"
              class="px-2 py-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-r-lg -ml-px transition-colors duration-150"
            >
              <ChevronDownIcon class="h-4 w-4 transform -rotate-90" />
            </button>
          </div>
          
          <!-- Right side: Items per page -->
          <div class="flex items-center space-x-2">
            <label for="per-page" class="text-sm text-gray-700 dark:text-gray-300">
              Show:
            </label>
            <select
              id="per-page"
              v-model="perPage"
              class="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              @change="loadUsers"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span class="text-sm text-gray-700 dark:text-gray-300">per page</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { api } from '../utils/api.js';
import StatusBadge from '../components/StatusBadge.vue';
import RoleBadge from '../components/RoleBadge.vue';
import UserIcon from '../components/icons/UserIcon.vue';
import ChevronDownIcon from '../components/icons/ChevronDownIcon.vue';
import SpinnerIcon from '../components/icons/SpinnerIcon.vue';
import EditIcon from '../components/icons/EditIcon.vue';
import DeleteIcon from '../components/icons/DeleteIcon.vue';
import ImpersonateIcon from '../components/icons/ImpersonateIcon.vue';
import ActionButton from '../components/ActionButton.vue';

export default {
  name: 'Users',
  components: {
    StatusBadge,
    RoleBadge,
    UserIcon,
    ChevronDownIcon,
    SpinnerIcon,
    EditIcon,
    DeleteIcon,
    ImpersonateIcon,
    ActionButton
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
      loadUsers,
      sortBy,
      changePage,
      getVisiblePages,
      formatDate,
      debouncedSearch,
      editUser,
      deleteUser,
      impersonateUser
    };
  }
};
</script>