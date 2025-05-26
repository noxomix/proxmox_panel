<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Navigation -->
    <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <h1 class="ml-3 text-xl font-semibold text-gray-900 dark:text-white">Proxmox Panel</h1>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Dark Mode Toggle -->
            <button
              @click="toggleDarkMode"
              class="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
              </svg>
            </button>

            <!-- User Menu -->
            <div class="relative">
              <button
                @click="showUserMenu = !showUserMenu"
                class="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <div class="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-medium">{{ user?.name?.charAt(0).toUpperCase() || 'U' }}</span>
                </div>
                <span class="hidden sm:block">{{ user?.name || 'User' }}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
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
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {{ user?.name || 'User' }}!
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Here's your dashboard overview
        </p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
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
              <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
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
              <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
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
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        
        <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Current Token:</p>
          <code class="text-sm text-gray-900 dark:text-white font-mono break-all">
            {{ currentToken || 'No token found' }}
          </code>
        </div>
        
        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-600 dark:text-gray-400">Token Length:</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ currentToken?.length || 0 }} characters</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Expires:</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ tokenExpiry || 'Unknown' }}</p>
          </div>
        </div>
      </div>

      <!-- User Info Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Information</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Name</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ user?.name || 'Not available' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Email</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ user?.email || 'Not available' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Status</p>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {{ user?.status || 'Unknown' }}
            </span>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(user?.created_at) || 'Not available' }}</p>
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
import { isDark, initDarkMode, toggleDarkMode } from '../utils/darkMode.js'

export default {
  name: 'Dashboard',
  setup() {
    const router = useRouter()
    const user = ref(null)
    const currentToken = ref('')
    const tokenExpiry = ref('')
    const showUserMenu = ref(false)
    const copied = ref(false)

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
      isDark,
      copied,
      toggleDarkMode,
      copyToken,
      handleLogout,
      formatDate
    }
  }
}
</script>