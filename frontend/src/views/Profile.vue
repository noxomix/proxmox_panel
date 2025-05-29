<template>
  <div class="max-w-4xl mx-auto space-y-8">

    <!-- Password Change Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
      
      <form @submit.prevent="changePassword" class="space-y-4">
        <!-- Current Password -->
        <PasswordInput
          id="currentPassword"
          v-model="passwordForm.currentPassword"
          label="Current Password"
          placeholder="Enter your current password"
          required
          :disabled="passwordLoading"
        />

        <!-- New Password -->
        <PasswordInput
          id="newPassword"
          v-model="passwordForm.newPassword"
          label="New Password"
          placeholder="Enter your new password"
          required
          :disabled="passwordLoading"
        />

        <!-- Confirm Password -->
        <PasswordInput
          id="confirmPassword"
          v-model="passwordForm.confirmPassword"
          label="Confirm New Password"
          placeholder="Confirm your new password"
          required
          :disabled="passwordLoading"
        />

        <!-- Password Error -->
        <div v-if="passwordError" class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p class="text-sm text-red-700 dark:text-red-400">{{ passwordError }}</p>
        </div>

        <!-- Password Success -->
        <div v-if="passwordSuccess" class="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p class="text-sm text-green-700 dark:text-green-400">{{ passwordSuccess }}</p>
        </div>

        <!-- Submit Button -->
        <RippleEffect :disabled="passwordLoading" color="rgba(255, 255, 255, 0.3)" v-slot="{ createRipple }">
          <button
            type="submit"
            :disabled="passwordLoading"
            @click="createRipple"
            @touchstart="createRipple"
            class="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
          >
            <span v-if="passwordLoading" class="flex items-center">
              <SpinnerIcon />
              Changing Password...
            </span>
            <span v-else class="flex items-center">
              <CheckIcon className="w-4 h-4 mr-2" />
              Change Password
            </span>
          </button>
        </RippleEffect>
      </form>
    </div>

    <!-- API Token Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">API Token</h2>
        <RippleEffect :disabled="tokenLoading" color="rgba(255, 255, 255, 0.3)" v-slot="{ createRipple }">
          <button
            @click="(e) => { createRipple(e); generateApiToken(); }"
            @touchstart="createRipple"
            :disabled="tokenLoading"
            :class="currentApiToken ? 'bg-brand-600 hover:bg-brand-700' : 'bg-green-600 hover:bg-green-700'"
            class="disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-all text-sm"
          >
            <span v-if="tokenLoading" class="flex items-center">
              <SpinnerIcon />
              Generating...
            </span>
            <span v-else class="flex items-center">
              <RefreshIcon v-if="currentApiToken" className="w-4 h-4 mr-2" />
              {{ currentApiToken ? 'Regenerate Token' : 'Generate New Token' }}
            </span>
          </button>
        </RippleEffect>
      </div>

      <p class="text-gray-600 dark:text-gray-400 mb-4">
        API tokens allow you to authenticate with the API. Tokens expire after 365 days.
      </p>

      <!-- Current API Token -->
      <div v-if="currentApiToken" class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs text-gray-500 dark:text-gray-400">Current API Token:</p>
          <CopyButton :text="currentApiToken" />
        </div>
        <code class="text-sm text-gray-900 dark:text-white font-mono break-all">
          {{ currentApiToken }}
        </code>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Expires: {{ formatDate(apiTokenExpiry) }}
        </p>
      </div>

      <!-- Token Error -->
      <div v-if="tokenError" class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4">
        <p class="text-sm text-red-700 dark:text-red-400">{{ tokenError }}</p>
      </div>
    </div>

    <!-- Active Sessions Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Active Sessions</h2>
        <div class="flex items-center space-x-3">
          <PrimaryButton
            variant="warning"
            :disabled="sessionsLoading || sessions.length <= 1"
            @click="revokeAllSessions"
          >
            <LogoutIcon class="w-4 h-4 mr-2" />
            Sign out all other devices
          </PrimaryButton>
          <RippleEffect :disabled="sessionsLoading" color="rgba(37, 99, 235, 0.3)" v-slot="{ createRipple }">
            <button
              @click="(e) => { createRipple(e); loadSessions(); }"
              @touchstart="createRipple"
              :disabled="sessionsLoading"
              class="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 text-sm"
            >
              <span v-if="sessionsLoading">Loading...</span>
              <span v-else>Refresh</span>
            </button>
          </RippleEffect>
        </div>
      </div>

      <p class="text-gray-600 dark:text-gray-400 mb-4">
        Manage your active login sessions across different devices and browsers.
      </p>

      <!-- Sessions List -->
      <div v-if="sessions.length > 0" class="space-y-3">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
        >
          <div class="flex-1">
            <div class="mb-1">
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ session.user_agent || 'Unknown Browser' }}
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2">
              <span>
                IP: {{ session.ip_address || 'Unknown' }} • 
                Last active: {{ formatDate(session.updated_at) }} •
                Expires: {{ formatDate(session.expires_at) }}
              </span>
              <span v-if="session.is_current" class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 whitespace-nowrap flex-shrink-0">
                Current Session
              </span>
            </p>
          </div>
          <div v-if="session.is_current" class="flex-shrink-0">
            <ActionButton
              variant="danger"
              title="Sign out (current session)"
              :icon="LogoutIcon"
              @click="handleCurrentSessionLogout"
            />
          </div>
          <div v-else class="flex-shrink-0">
            <ActionButton
              variant="danger"
              title="Sign out session"
              :icon="LogoutIcon"
              @click="revokeSession(session.id)"
            />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!sessionsLoading" class="text-center py-8">
        <p class="text-gray-500 dark:text-gray-400">No active sessions found</p>
      </div>

      <!-- Loading State -->
      <div v-if="sessionsLoading" class="text-center py-8">
        <SpinnerIcon />
        <p class="text-gray-500 dark:text-gray-400 mt-2">Loading sessions...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api.js'
import PasswordInput from '../components/PasswordInput.vue'
import SpinnerIcon from '../components/icons/SpinnerIcon.vue'
import CheckIcon from '../components/icons/CheckIcon.vue'
import RefreshIcon from '../components/icons/RefreshIcon.vue'
import LogoutIcon from '../components/icons/LogoutIcon.vue'
import CopyButton from '../components/CopyButton.vue'
import RippleEffect from '../components/RippleEffect.vue'
import ActionButton from '../components/ActionButton.vue'
import PrimaryButton from '../components/PrimaryButton.vue'

export default {
  name: 'Profile',
  components: {
    PasswordInput,
    SpinnerIcon,
    CheckIcon,
    RefreshIcon,
    LogoutIcon,
    CopyButton,
    RippleEffect,
    ActionButton,
    PrimaryButton
  },
  setup() {
    const router = useRouter()
    
    // Password Change
    const passwordForm = ref({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    const passwordLoading = ref(false)
    const passwordError = ref('')
    const passwordSuccess = ref('')

    // API Token
    const currentApiToken = ref('')
    const apiTokenExpiry = ref('')
    const tokenLoading = ref(false)
    const tokenError = ref('')

    // Sessions
    const sessions = ref([])
    const sessionsLoading = ref(false)

    onMounted(async () => {
      if (!api.isAuthenticated()) {
        router.push('/login')
        return
      }
      
      await loadSessions()
      await loadApiToken()
    })

    const changePassword = async () => {
      passwordError.value = ''
      passwordSuccess.value = ''

      if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
        passwordError.value = 'New passwords do not match'
        return
      }

      if (passwordForm.value.newPassword.length < 6) {
        passwordError.value = 'New password must be at least 6 characters long'
        return
      }

      passwordLoading.value = true

      try {
        const response = await api.changePassword(
          passwordForm.value.currentPassword,
          passwordForm.value.newPassword
        )

        if (response.success) {
          passwordSuccess.value = 'Password changed successfully'
          passwordForm.value = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }
        } else {
          passwordError.value = response.message || 'Failed to change password'
        }
      } catch (error) {
        passwordError.value = error.message || 'Failed to change password'
      } finally {
        passwordLoading.value = false
      }
    }

    const generateApiToken = async () => {
      tokenError.value = ''
      tokenLoading.value = true

      try {
        const response = await api.generateApiToken()

        if (response.success) {
          currentApiToken.value = response.data.token
          apiTokenExpiry.value = response.data.expires_at
        } else {
          tokenError.value = response.message || 'Failed to generate API token'
        }
      } catch (error) {
        tokenError.value = error.message || 'Failed to generate API token'
      } finally {
        tokenLoading.value = false
      }
    }

    const loadApiToken = async () => {
      try {
        const response = await api.getCurrentApiToken()
        if (response.success && response.data) {
          currentApiToken.value = response.data.token
          apiTokenExpiry.value = response.data.expires_at
        }
      } catch (error) {
        console.error('Failed to load API token:', error)
      }
    }


    const loadSessions = async () => {
      sessionsLoading.value = true

      try {
        const response = await api.getSessions()
        if (response.success) {
          sessions.value = response.data || []
        }
      } catch (error) {
        console.error('Failed to load sessions:', error)
      } finally {
        sessionsLoading.value = false
      }
    }

    const revokeSession = async (sessionId) => {
      try {
        const response = await api.revokeSession(sessionId)
        if (response.success) {
          // Remove the session from UI immediately
          sessions.value = sessions.value.filter(s => s.id !== sessionId)
        }
      } catch (error) {
        console.error('Failed to revoke session:', error)
      }
    }

    const revokeAllSessions = async () => {
      try {
        const response = await api.revokeAllSessions()
        if (response.success) {
          // Remove all other sessions from UI, keep only current session
          sessions.value = sessions.value.filter(s => s.is_current)
        }
      } catch (error) {
        console.error('Failed to revoke all sessions:', error)
      }
    }

    const handleCurrentSessionLogout = async () => {
      try {
        await api.logout()
        router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
        router.push('/login')
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'Unknown'
      return new Date(dateString).toLocaleString()
    }

    return {
      passwordForm,
      passwordLoading,
      passwordError,
      passwordSuccess,
      currentApiToken,
      apiTokenExpiry,
      tokenLoading,
      tokenError,
      sessions,
      sessionsLoading,
      changePassword,
      generateApiToken,
      loadApiToken,
      loadSessions,
      revokeSession,
      revokeAllSessions,
      handleCurrentSessionLogout,
      formatDate
    }
  }
}
</script>