<template>
  <div>
      <!-- Welcome Section -->
      <div class="mb-8">
        <h2 v-if="!loading" class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {{ user?.name || 'User' }}!
        </h2>
        <div v-else class="flex items-center gap-3 mb-2">
          <span class="text-3xl font-bold text-gray-900 dark:text-white">Welcome back,</span>
          <div class="skeleton-text-xl w-32"></div>
          <span class="text-3xl font-bold text-gray-900 dark:text-white">!</span>
        </div>
        <p class="text-gray-600 dark:text-gray-400">
          Here's your dashboard overview
        </p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <CheckIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">Active</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Account Type</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">Admin</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <LockIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Session</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">Secure</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Auth Token Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Authentication Token</h3>
          <CopyButton :text="currentToken" />
        </div>
        
        <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Current Token:</p>
          <code v-if="!loading" class="text-sm text-gray-900 dark:text-white font-mono break-all">
            {{ currentToken || 'No token found' }}
          </code>
          <div v-else class="skeleton-text w-full"></div>
        </div>
        
        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-600 dark:text-gray-400 mb-1">Token Length:</p>
            <p v-if="!loading" class="font-medium text-gray-900 dark:text-white">{{ currentToken?.length || 0 }} characters</p>
            <div v-else class="skeleton-text w-20 mt-1"></div>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400 mb-1">Expires:</p>
            <p v-if="!loading" class="font-medium text-gray-900 dark:text-white">{{ tokenExpiry || 'Unknown' }}</p>
            <div v-else class="skeleton-text w-32 mt-1"></div>
          </div>
        </div>
      </div>

      <!-- User Info Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Information</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Name</p>
            <p v-if="!loading" class="font-medium text-gray-900 dark:text-white">{{ user?.name || 'Not available' }}</p>
            <div v-else class="skeleton-text w-24 mt-1"></div>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
            <p v-if="!loading" class="font-medium text-gray-900 dark:text-white">{{ user?.email || 'Not available' }}</p>
            <div v-else class="skeleton-text w-32 mt-1"></div>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
            <span v-if="!loading" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {{ user?.status || 'Unknown' }}
            </span>
            <div v-else class="skeleton-text w-16 h-5 rounded-full mt-1"></div>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Member Since</p>
            <p v-if="!loading" class="font-medium text-gray-900 dark:text-white">{{ formatDate(user?.created_at) || 'Not available' }}</p>
            <div v-else class="skeleton-text w-28 mt-1"></div>
          </div>
        </div>
      </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api.js'
import CheckIcon from '../components/icons/CheckIcon.vue'
import UserIcon from '../components/icons/UserIcon.vue'
import LockIcon from '../components/icons/LockIcon.vue'
import CopyButton from '../components/CopyButton.vue'

export default {
  name: 'Dashboard',
  components: {
    CheckIcon,
    UserIcon,
    LockIcon,
    CopyButton
  },
  setup() {
    const router = useRouter()
    const user = ref(null)
    const currentToken = ref('')
    const tokenExpiry = ref('')
    const loading = ref(true)

    onMounted(async () => {
      // Check authentication
      if (!api.isAuthenticated()) {
        router.push('/login')
        return
      }

      // Get current token from localStorage
      currentToken.value = api.getToken()

      // Fetch user data
      try {
        const response = await api.me()
        if (response.success) {
          user.value = response.data.user
          tokenExpiry.value = new Date(response.data.token_expires_at).toLocaleString()
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      } finally {
        loading.value = false
      }
    })


    const formatDate = (dateString) => {
      if (!dateString) return null
      return new Date(dateString).toLocaleDateString()
    }

    return {
      user,
      currentToken,
      tokenExpiry,
      loading,
      formatDate
    }
  }
}
</script>