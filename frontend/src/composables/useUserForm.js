/**
 * User form management composable
 * Handles form state, validation, and API operations for user create/edit
 */
import { ref, computed, watch } from 'vue';
import { api } from '../utils/api.js';

export function useUserForm(user = null) {
  const loading = ref(false);
  const errors = ref({});
  const showPasswordField = ref(false);

  const form = ref({
    name: '',
    email: '',
    password: '',
    role_id: '',
    status: 'active'
  });

  const isEditing = computed(() => !!user);

  const isFormValid = computed(() => {
    const hasBasicInfo = form.value.name.trim() && form.value.email.trim();
    const hasPassword = isEditing.value ? true : form.value.password.trim();
    return hasBasicInfo && hasPassword;
  });

  const resetForm = () => {
    form.value = {
      name: '',
      email: '',
      password: '',
      role_id: '',
      status: 'active'
    };
    errors.value = {};
    showPasswordField.value = false;
  };

  const populateForm = () => {
    if (user) {
      form.value = {
        name: user.name || '',
        email: user.email || '',
        password: '',
        role_id: user.role_id || '',
        status: user.status || 'active'
      };
    }
  };

  const setDefaultRole = (roles) => {
    if (!isEditing.value && !form.value.role_id) {
      const customerRole = roles.find(role => role.name === 'customer');
      if (customerRole) {
        form.value.role_id = customerRole.id;
      }
    }
  };

  const submitForm = async () => {
    if (!isFormValid.value) return null;

    loading.value = true;
    errors.value = {};

    try {
      const data = {
        name: form.value.name,
        email: form.value.email,
        role_id: form.value.role_id || null,
        status: form.value.status
      };

      // Add password if provided
      if (form.value.password || !isEditing.value) {
        data.password = form.value.password;
      }

      let response;
      if (isEditing.value) {
        response = await api.put(`/users/${user.id}`, data);
      } else {
        response = await api.post('/users', data);
      }

      if (response.success) {
        return response.data;
      } else {
        if (response.errors) {
          errors.value = response.errors;
        } else {
          throw new Error(response.message || 'Failed to save user');
        }
        return null;
      }
    } catch (error) {
      console.error('Error saving user:', error);
      errors.value = { general: error.message || 'Failed to save user' };
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Initialize form when user prop changes
  watch(() => user, populateForm, { immediate: true });

  return {
    form,
    errors,
    loading,
    showPasswordField,
    isEditing,
    isFormValid,
    resetForm,
    populateForm,
    setDefaultRole,
    submitForm
  };
}