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
      <nav class="mt-6 px-3">
        <ul class="space-y-2">
          <SidebarLink 
            to="/dashboard" 
            :icon="DashboardIcon" 
            :sidebarCollapsed="sidebarCollapsed"
          >
            Dashboard
          </SidebarLink>
          
          <SidebarLink 
            to="/users" 
            :icon="UsersIcon" 
            :sidebarCollapsed="sidebarCollapsed"
          >
            Users
          </SidebarLink>
          
          <SidebarLink 
            :icon="BriefcaseIcon" 
            :sidebarCollapsed="sidebarCollapsed"
          >
            Security
          </SidebarLink>
          
          <SidebarLink 
            :icon="LockIcon" 
            :sidebarCollapsed="sidebarCollapsed"
          >
            Settings
          </SidebarLink>
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
              <RippleEffect color="rgba(107, 114, 128, 0.3)" v-slot="{ createRipple }">
                <button
                  @click="(e) => { createRipple(e); showMobileSidebar = !showMobileSidebar; }"
                  @touchstart="createRipple"
                  class="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-3"
                >
                  <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </RippleEffect>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ pageTitle }}
              </h2>
            </div>
            
            <div class="flex items-center space-x-4">
              <!-- Dark Mode Toggle -->
              <DarkModeToggle />

              <!-- User Menu -->
              <div class="relative">
                <RippleEffect color="rgba(107, 114, 128, 0.3)" v-slot="{ createRipple }">
                  <button
                    @click="(e) => { createRipple(e); showUserMenu = !showUserMenu; }"
                    @touchstart="createRipple"
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
                </RippleEffect>

                <!-- Dropdown Menu -->
                <div v-if="showUserMenu" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <div class="py-1">
                    <router-link
                      to="/profile"
                      @click="showUserMenu = false"
                      class="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                      <UserSettingsIcon className="w-4 h-4 mr-2" />
                      Profile & API
                    </router-link>
                    <RippleEffect color="rgba(225, 29, 72, 0.3)" v-slot="{ createRipple }">
                      <button
                        @click="(e) => { createRipple(e); handleLogout(); }"
                        @touchstart="createRipple"
                        class="w-full flex items-center px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-300 transition-all duration-200"
                      >
                        <LogoutIcon className="w-4 h-4 mr-2" />
                        Sign out
                      </button>
                    </RippleEffect>
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
      @click="showMobileSidebar = false"
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
import BriefcaseIcon from '../components/icons/BriefcaseIcon.vue'
import GorillaAvatarIcon from '../components/icons/GiraffeAvatarIcon.vue'
import DarkModeToggle from '../components/DarkModeToggle.vue'
import AppLogo from '../components/AppLogo.vue'
import SidebarToggle from '../components/SidebarToggle.vue'
import SidebarLink from '../components/SidebarLink.vue'
import LogoutIcon from '../components/icons/LogoutIcon.vue'
import DashboardIcon from '../components/icons/DashboardIcon.vue'
import UsersIcon from '../components/icons/UsersIcon.vue'
import UserSettingsIcon from '../components/icons/UserSettingsIcon.vue'
import RippleEffect from '../components/RippleEffect.vue'

export default {
  name: 'AppLayout',
  components: {
    ChevronDownIcon,
    UserIcon,
    LockIcon,
    BriefcaseIcon,
    GorillaAvatarIcon,
    DarkModeToggle,
    AppLogo,
    SidebarToggle,
    SidebarLink,
    LogoutIcon,
    DashboardIcon,
    UsersIcon,
    UserSettingsIcon,
    RippleEffect
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const user = ref(null)
    const showUserMenu = ref(false)
    const loading = ref(true)
    const sidebarCollapsed = ref(false)

    const showMobileSidebar = ref(false)

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
          showMobileSidebar.value = false
        }
      }
      
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
      handleLogout,
      UserIcon,
      BriefcaseIcon,
      LockIcon,
      DashboardIcon,
      UsersIcon
    }
  }
}
</script>