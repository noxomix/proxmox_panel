<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
    <!-- Sidebar -->
    <aside 
      :class="[
        'bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out z-50',
        sidebarCollapsed ? 'w-16' : 'w-64',
        'md:relative md:translate-x-0',
        showMobileSidebar ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full md:translate-x-0'
      ]"
    >
      <!-- Sidebar Header -->
      <div class="h-16 flex items-center py-3 mt-2" :class="sidebarCollapsed ? 'justify-center px-6' : 'justify-between px-6 pr-6'">
        <div 
          v-if="!sidebarCollapsed" 
          class="transition-opacity duration-300 flex-1 flex items-center justify-center mr-8"
        >
          <AppLogo />
        </div>
        <div class="flex items-center">
          <SidebarToggle 
            :isCollapsed="sidebarCollapsed"
            @toggle="toggleSidebar"
          />
        </div>
      </div>

      <!-- Sidebar Navigation -->
      <nav class="mt-4 px-2">
        <ul class="space-y-2">
          <li>
            <router-link
              to="/dashboard"
              class="flex items-center px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :class="{ 'justify-center': sidebarCollapsed }"
            >
              <UserIcon className="w-5 h-5" />
              <span v-if="!sidebarCollapsed" class="ml-3">Dashboard</span>
            </router-link>
          </li>
          <li>
            <button
              class="w-full flex items-center px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :class="{ 'justify-center': sidebarCollapsed }"
            >
              <ShieldIcon className="w-5 h-5" />
              <span v-if="!sidebarCollapsed" class="ml-3">Security</span>
            </button>
          </li>
          <li>
            <button
              class="w-full flex items-center px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :class="{ 'justify-center': sidebarCollapsed }"
            >
              <LockIcon className="w-5 h-5" />
              <span v-if="!sidebarCollapsed" class="ml-3">Settings</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="bg-gray-50 dark:bg-gray-900">
        <div class="px-8 sm:px-12 lg:px-16">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <!-- Mobile menu button -->
              <button
                @click="sidebarCollapsed = !sidebarCollapsed"
                class="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-3"
              >
                <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ pageTitle }}
              </h2>
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
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-auto">
        <div class="py-8 px-8 sm:px-12 lg:px-16">
          <router-view />
        </div>
      </main>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <div 
      v-if="showMobileSidebar" 
      @click="sidebarCollapsed = true"
      class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
    ></div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../utils/api.js'
import ChevronDownIcon from '../components/icons/ChevronDownIcon.vue'
import UserIcon from '../components/icons/UserIcon.vue'
import LockIcon from '../components/icons/LockIcon.vue'
import ShieldIcon from '../components/icons/ShieldIcon.vue'
import GorillaAvatarIcon from '../components/icons/GiraffeAvatarIcon.vue'
import DarkModeToggle from '../components/DarkModeToggle.vue'
import AppLogo from '../components/AppLogo.vue'
import SidebarToggle from '../components/SidebarToggle.vue'

export default {
  name: 'AppLayout',
  components: {
    ChevronDownIcon,
    UserIcon,
    LockIcon,
    ShieldIcon,
    GorillaAvatarIcon,
    DarkModeToggle,
    AppLogo,
    SidebarToggle
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const user = ref(null)
    const showUserMenu = ref(false)
    const loading = ref(true)
    const sidebarCollapsed = ref(false)

    const showMobileSidebar = computed(() => {
      return !sidebarCollapsed.value && typeof window !== 'undefined' && window.innerWidth < 768
    })

    const pageTitle = computed(() => {
      return route.meta?.title || route.name || 'Dashboard'
    })

    onMounted(async () => {
      // Check authentication
      if (!api.isAuthenticated()) {
        router.push('/login')
        return
      }

      // Fetch user data
      try {
        const response = await api.me()
        if (response.success) {
          user.value = response.data.user
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

      // Handle responsive sidebar
      const handleResize = () => {
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
          sidebarCollapsed.value = false
        } else if (typeof window !== 'undefined' && window.innerWidth < 768) {
          sidebarCollapsed.value = true
        }
      }
      
      // Initial responsive check
      handleResize()
      
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize)
      }
    })

    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value
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

    return {
      user,
      showUserMenu,
      loading,
      sidebarCollapsed,
      showMobileSidebar,
      pageTitle,
      toggleSidebar,
      handleLogout
    }
  }
}
</script>