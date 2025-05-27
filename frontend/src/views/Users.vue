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
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <!-- Results per page -->
        <div>
          <label for="per-page" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Results per page
          </label>
          <select
            id="per-page"
            v-model="perPage"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            @change="loadUsers"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
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
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
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
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
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
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
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
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th 
                scope="col" 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
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
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr 
              v-for="user in users" 
              :key="user.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {{ user.id }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <UserIcon class="h-8 w-8 text-gray-400 dark:text-gray-500 mr-3" />
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ user.name }}
                    </div>
                    <div v-if="user.username" class="text-sm text-gray-500 dark:text-gray-400">
                      @{{ user.username }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {{ user.email }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="{
                    'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400': user.role === 'admin',
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400': user.role === 'user'
                  }"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                >
                  <ShieldIcon v-if="user.role === 'admin'" class="w-3 h-3 mr-1" />
                  <UserIcon v-else class="w-3 h-3 mr-1" />
                  {{ user.role === 'admin' ? 'Admin' : 'User' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <StatusBadge :status="user.status" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(user.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="p-8 text-center">
        <UserIcon class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ searchQuery ? 'Try adjusting your search criteria.' : 'No users have been created yet.' }}
        </p>
      </div>

      <!-- Pagination -->
      <div v-if="pagination && pagination.totalPages > 1" class="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              :disabled="!pagination.hasPrev"
              @click="changePage(pagination.page - 1)"
              :class="{
                'opacity-50 cursor-not-allowed': !pagination.hasPrev,
                'hover:bg-gray-50 dark:hover:bg-gray-700': pagination.hasPrev
              }"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            >
              Previous
            </button>
            <button
              :disabled="!pagination.hasNext"
              @click="changePage(pagination.page + 1)"
              :class="{
                'opacity-50 cursor-not-allowed': !pagination.hasNext,
                'hover:bg-gray-50 dark:hover:bg-gray-700': pagination.hasNext
              }"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            >
              Next
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
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
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  :disabled="!pagination.hasPrev"
                  @click="changePage(pagination.page - 1)"
                  :class="{
                    'opacity-50 cursor-not-allowed': !pagination.hasPrev,
                    'hover:bg-gray-50 dark:hover:bg-gray-700': pagination.hasPrev
                  }"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  <ChevronDownIcon class="h-5 w-5 transform rotate-90" />
                </button>
                
                <!-- Page Numbers -->
                <template v-for="page in getVisiblePages()" :key="page">
                  <button
                    v-if="page !== '...'"
                    @click="changePage(page)"
                    :class="{
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400': page === pagination.page,
                      'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700': page !== pagination.page
                    }"
                    class="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                  >
                    {{ page }}
                  </button>
                  <span v-else class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                    ...
                  </span>
                </template>

                <button
                  :disabled="!pagination.hasNext"
                  @click="changePage(pagination.page + 1)"
                  :class="{
                    'opacity-50 cursor-not-allowed': !pagination.hasNext,
                    'hover:bg-gray-50 dark:hover:bg-gray-700': pagination.hasNext
                  }"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  <ChevronDownIcon class="h-5 w-5 transform -rotate-90" />
                </button>
              </nav>
            </div>
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
import UserIcon from '../components/icons/UserIcon.vue';
import ShieldIcon from '../components/icons/ShieldIcon.vue';
import ChevronDownIcon from '../components/icons/ChevronDownIcon.vue';
import SpinnerIcon from '../components/icons/SpinnerIcon.vue';

export default {
  name: 'Users',
  components: {
    StatusBadge,
    UserIcon,
    ShieldIcon,
    ChevronDownIcon,
    SpinnerIcon
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
      debouncedSearch
    };
  }
};
</script>