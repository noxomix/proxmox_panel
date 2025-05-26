<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Navigation -->
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Proxmox Panel</h1>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Dark Mode Toggle -->
            <DarkModeToggle />

            <!-- User Menu -->
            <div class="relative">
              <button
                @click="showUserMenu = !showUserMenu"
                class="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <div v-if="!loading" class="w-8 h-8 rounded-full overflow-hidden">
                  <GorillaAvatarIcon variant="default" />
                </div>
                <div v-else class="skeleton-avatar"></div>
                <span v-if="!loading" class="hidden sm:block">{{ user?.name || 'User' }}</span>
                <div v-else class="skeleton-text w-20 hidden sm:block"></div>
                <ChevronDownIcon className="w-4 h-4" />
              </button>

              <!-- Dropdown Menu -->
              <div v-if="showUserMenu" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div class="py-1">
                  <button
                    @click="handleLogout"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
          <button
            @click="copyToken"
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
          >
            <CopyIcon className="w-4 h-4 mr-1" />
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
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
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api.js'
import ChevronDownIcon from '../components/icons/ChevronDownIcon.vue'
import CheckIcon from '../components/icons/CheckIcon.vue'
import UserIcon from '../components/icons/UserIcon.vue'
import LockIcon from '../components/icons/LockIcon.vue'
import CopyIcon from '../components/icons/CopyIcon.vue'
import GorillaAvatarIcon from '../components/icons/GiraffeAvatarIcon.vue'
import DarkModeToggle from '../components/DarkModeToggle.vue'

export default {
  name: 'Dashboard',
  components: {
    ChevronDownIcon,
    CheckIcon,
    UserIcon,
    LockIcon,
    CopyIcon,
    GorillaAvatarIcon,
    DarkModeToggle
  },
  setup() {
    const router = useRouter()
    const user = ref(null)
    const currentToken = ref('')
    const tokenExpiry = ref('')
    const showUserMenu = ref(false)
    const copied = ref(false)
    const loading = ref(true)

    onMounted(async () => {
      // Check authentication
      if (!api.isAuthenticated()) {
        router.push('/login')
        return
      }

      // Get current token from localStorage
      currentToken.value = api.getToken()

      // Dark mode is already initialized in main.js

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

      // Close user menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.relative')) {
          showUserMenu.value = false
        }
      })
    })

    const copyToken = async () => {
      if (currentToken.value) {
        try {
          await navigator.clipboard.writeText(currentToken.value)
          copied.value = true
          setTimeout(() => {
            copied.value = false
          }, 2000)
        } catch (error) {
          console.error('Failed to copy token:', error)
        }
      }
    }

    const handleLogout = async () => {
      try {
        await api.logout()
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        router.push('/login')
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return null
      return new Date(dateString).toLocaleDateString()
    }

    return {
      user,
      currentToken,
      tokenExpiry,
      showUserMenu,
      copied,
      loading,
      copyToken,
      handleLogout,
      formatDate
    }
  }
}
</script>