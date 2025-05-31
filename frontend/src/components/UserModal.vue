<template>
  <ModalInterface 
    :show="show" 
    @close="handleClose"
    title="User Management"
    size="2xl"
  >
    <!-- Content -->
    <form @submit.prevent="save" class="space-y-6">
      <!-- Basic User Information -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Name -->
        <BaseInput
          id="name"
          v-model="form.name"
          label="Full Name"
          placeholder="Enter full name"
          required
          :error="errors.name?.[0]"
          :disabled="loading"
        />

        <!-- Username -->
        <BaseInput
          id="username"
          v-model="form.username"
          label="Username"
          placeholder="Enter username"
          required
          :disabled="loading || isEditing"
          :error="errors.username?.[0]"
        />
      </div>

      <!-- Email -->
      <BaseInput
        id="email"
        v-model="form.email"
        label="Email Address"
        type="email"
        placeholder="Enter email address"
        required
        :error="errors.email?.[0]"
        :disabled="loading"
      />

      <!-- Role Selection -->
      <div>
        <label for="role" class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          Role <span class="text-red-500">*</span>
        </label>
        <select
          id="role"
          v-model="form.role_id"
          required
          :disabled="loading || isEditingSelf"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
          :class="{
            'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-50': isEditingSelf,
            'border-red-300 dark:border-red-600': errors.role_id
          }"
        >
          <option value="">Select a role</option>
          <option 
            v-for="role in roles" 
            :key="role.id" 
            :value="role.id"
          >
            {{ role.display_name }}
          </option>
        </select>
        <p v-if="errors.role_id" class="mt-1 text-sm text-red-600 dark:text-red-400">
          {{ errors.role_id[0] }}
        </p>
      </div>

      <!-- Status (for editing only) -->
      <div v-if="isEditing">
        <label for="status" class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          Status
        </label>
        <select
          id="status"
          v-model="form.status"
          :disabled="loading || isEditingSelf"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
          :class="{
            'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-50': isEditingSelf
          }"
        >
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <!-- Password Section -->
      <div v-if="!isEditing || showPasswordField">
        <div v-if="isEditing" class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-900 dark:text-white">
            {{ showPasswordField ? 'New Password' : 'Password' }}
            <span v-if="!isEditing" class="text-red-500">*</span>
          </label>
          <button
            v-if="isEditing && !showPasswordField"
            type="button"
            @click="showPasswordField = true"
            class="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            Change Password
          </button>
        </div>
        <PasswordInput
          id="password"
          v-model="form.password"
          :label="isEditing ? '' : 'Password'"
          placeholder="Enter password"
          :required="!isEditing"
          :error="errors.password?.[0]"
          :disabled="loading"
        />
      </div>

      <!-- Self-editing warning -->
      <div v-if="isEditingSelf" class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p class="text-sm text-amber-800 dark:text-amber-200">
          <strong>Note:</strong> You are editing your own profile. Some fields may be restricted.
        </p>
      </div>
    </form>

    <!-- Footer -->
    <template #footer>
      <div class="flex justify-end space-x-3">
        <SecondaryButton
          @click="handleClose"
          :disabled="loading"
        >
          Cancel
        </SecondaryButton>
        <PrimaryButton
          @click="save"
          :disabled="loading || !isFormValid"
        >
          <SpinnerIcon v-if="loading" />
          {{ isEditing ? 'Update User' : 'Create User' }}
        </PrimaryButton>
      </div>
    </template>
  </ModalInterface>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { api } from '../utils/api.js';
import ModalInterface from './ModalInterface.vue';
import BaseInput from './BaseInput.vue';
import PasswordInput from './PasswordInput.vue';
import SpinnerIcon from './icons/SpinnerIcon.vue';
import PrimaryButton from './PrimaryButton.vue';
import SecondaryButton from './SecondaryButton.vue';

export default {
  name: 'UserModal',
  components: {
    ModalInterface,
    BaseInput,
    PasswordInput,
    SpinnerIcon,
    PrimaryButton,
    SecondaryButton
  },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    user: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const loading = ref(false);
    const roles = ref([]);
    const errors = ref({});
    const showPasswordField = ref(false);

    const form = ref({
      name: '',
      username: '',
      email: '',
      password: '',
      role_id: '',
      status: 'active'
    });

    const isEditing = computed(() => !!props.user);
    
    const currentUser = ref(null);
    const canAssignRoles = ref(false);
    
    const isEditingSelf = computed(() => {
      return isEditing.value && currentUser.value && props.user?.id === currentUser.value.id;
    });

    const isFormValid = computed(() => {
      const hasBasicInfo = form.value.name.trim() && form.value.username.trim() && form.value.email.trim();
      const hasPassword = isEditing.value ? true : form.value.password.trim();
      return hasBasicInfo && hasPassword;
    });

    const loadCurrentUser = async () => {
      try {
        const response = await api.get('/auth/profile');
        if (response.success) {
          currentUser.value = response.data.user;
          
          // Check if user has role assignment permission
          const permissionsResponse = await api.get(`/users/${response.data.user.id}/permissions`);
          if (permissionsResponse.success) {
            canAssignRoles.value = permissionsResponse.data.permissions.some(
              p => p.name === 'user_role_assign'
            );
          }
        }
      } catch (error) {
        console.error('Failed to load current user:', error);
      }
    };

    const loadRoles = async () => {
      try {
        // For editing: load assignable roles (respects permission hierarchy)
        // For creating: load assignable roles as well
        const response = await api.get('/roles/assignable');
        if (response.success) {
          roles.value = response.data.roles;
        }
      } catch (error) {
        console.error('Failed to load assignable roles:', error);
        // Fallback to empty array if no permission to assign roles
        roles.value = [];
      }
    };

    const populateForm = () => {
      if (props.user) {
        form.value = {
          name: props.user.name || '',
          username: props.user.username || '',
          email: props.user.email || '',
          password: '',
          role_id: props.user.role_id || '',
          status: props.user.status || 'active'
        };
      } else {
        form.value = {
          name: '',
          username: '',
          email: '',
          password: '',
          role_id: '',
          status: 'active'
        };
      }
      errors.value = {};
      showPasswordField.value = false;
    };

    const save = async () => {
      if (!isFormValid.value) return;
      
      loading.value = true;
      errors.value = {};

      try {
        const userData = { ...form.value };
        
        // Don't send empty password for updates
        if (isEditing.value && !userData.password) {
          delete userData.password;
        }

        let response;
        if (isEditing.value) {
          response = await api.put(`/users/${props.user.id}`, userData);
        } else {
          response = await api.post('/users', userData);
        }

        if (response.success) {
          emit('saved', response.data.user);
          handleClose();
        } else {
          if (response.errors) {
            errors.value = response.errors;
          } else {
            console.error('Save failed:', response.message);
          }
        }
      } catch (error) {
        console.error('Save error:', error);
        // Handle different error response structures
        if (error.response?.data?.errors) {
          errors.value = error.response.data.errors;
        } else if (error.message && error.message.includes('validation')) {
          // Handle validation errors that might come as simple message
          console.log('Validation error structure:', error);
        }
        // Log the full error to help debug
        console.log('Full error object:', error);
      } finally {
        loading.value = false;
      }
    };

    const handleClose = () => {
      emit('close');
      populateForm();
    };

    // Watch for modal visibility and user changes
    watch(() => [props.show, props.user], async ([show, user]) => {
      if (show) {
        await Promise.all([loadRoles(), loadCurrentUser()]);
        populateForm();
      }
    }, { immediate: true });

    return {
      loading,
      roles,
      errors,
      showPasswordField,
      form,
      isEditing,
      currentUser,
      canAssignRoles,
      isEditingSelf,
      isFormValid,
      save,
      handleClose
    };
  }
};
</script>