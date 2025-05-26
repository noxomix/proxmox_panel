<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Proxmox Panel</h1>
          <p class="text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- Identity Field -->
          <div>
            <label for="identity" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email or Username
            </label>
            <input
              id="identity"
              v-model="form.identity"
              type="text"
              required
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your email or username"
              :disabled="loading"
            />
          </div>

          <!-- Password Field -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                :disabled="loading"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                :disabled="loading"
              >
                <EyeIcon v-if="showPassword" className="w-5 h-5" />
                <EyeSlashIcon v-else className="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p class="text-sm text-red-700 dark:text-red-400">{{ error }}</p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="flex items-center justify-center">
              <SpinnerIcon />
              Signing in...
            </span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <!-- Footer -->
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Secure authentication powered by Proxmox Panel
          </p>
        </div>
      </div>

      <!-- Dark Mode Toggle -->
      <div class="mt-6 flex justify-center">
        <DarkModeToggle />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api.js'
import EyeIcon from '../components/icons/EyeIcon.vue'
import EyeSlashIcon from '../components/icons/EyeSlashIcon.vue'
import SpinnerIcon from '../components/icons/SpinnerIcon.vue'
import DarkModeToggle from '../components/DarkModeToggle.vue'

export default {
  name: 'Login',
  components: {
    EyeIcon,
    EyeSlashIcon,
    SpinnerIcon,
    DarkModeToggle
  },
  setup() {
    const router = useRouter()
    const loading = ref(false)
    const error = ref('')
    const showPassword = ref(false)
    
    const form = ref({
      identity: '',
      password: ''
    })

    // Check if already authenticated
    onMounted(() => {
      if (api.isAuthenticated()) {
        router.push('/dashboard')
      }
      
      // Dark mode is already initialized in main.js
    })

    const handleLogin = async () => {
      loading.value = true
      error.value = ''

      try {
        const response = await api.login(form.value.identity, form.value.password)
        
        if (response.success) {
          router.push('/dashboard')
        } else {
          error.value = response.message || 'Login failed'
        }
      } catch (err) {
        error.value = err.message || 'Login failed. Please try again.'
      } finally {
        loading.value = false
      }
    }

    return {
      form,
      loading,
      error,
      showPassword,
      handleLogin
    }
  }
}
</script>