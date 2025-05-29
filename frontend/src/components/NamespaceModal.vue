<template>
  <ModalInterface
    :show="show"
    :title="modalTitle"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Name -->
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name <span class="text-red-500">*</span>
        </label>
        <BaseInput
          id="name"
          v-model="form.name"
          placeholder="e.g., kunde123"
          :error="errors.name"
          :disabled="isEditMode"
          autocomplete="off"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Only letters, numbers, hyphens and underscores allowed
        </p>
      </div>

      <!-- Domain -->
      <div>
        <label for="domain" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Domain
        </label>
        <BaseInput
          id="domain"
          v-model="form.domain"
          placeholder="e.g., example.com, sub.domain.com, or example.com:8080"
          :error="errors.domain"
          autocomplete="off"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Optional domain or subdomain with optional port for this namespace
        </p>
      </div>

      <!-- Parent Namespace -->
      <div v-if="!isEditMode">
        <label for="parent" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Parent Namespace
        </label>
        <select
          id="parent"
          v-model="form.parent_id"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          <option
            v-for="ns in availableParents"
            :key="ns.id"
            :value="ns.id"
          >
            {{ '\u00A0'.repeat(ns.depth * 2) }}{{ ns.full_path }}
          </option>
        </select>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Select a parent to create a nested namespace
        </p>
      </div>

      <!-- Preview -->
      <div v-if="form.name" class="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
        <p class="text-sm text-gray-600 dark:text-gray-400">Full path preview:</p>
        <code class="text-sm font-mono text-gray-900 dark:text-white">{{ pathPreview }}</code>
      </div>

      <!-- Current Info (Edit Mode) -->
      <div v-if="isEditMode" class="space-y-2 bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
        <div class="text-sm">
          <span class="text-gray-600 dark:text-gray-400">Full Path:</span>
          <code class="ml-2 font-mono text-gray-900 dark:text-white">{{ namespace.full_path }}</code>
        </div>
        <div class="text-sm" v-if="namespace.domain">
          <span class="text-gray-600 dark:text-gray-400">Domain:</span>
          <code class="ml-2 font-mono text-gray-900 dark:text-white">{{ namespace.domain }}</code>
        </div>
        <div class="text-sm">
          <span class="text-gray-600 dark:text-gray-400">Depth:</span>
          <span class="ml-2 text-gray-900 dark:text-white">{{ namespace.depth }}</span>
        </div>
        <div class="text-sm" v-if="namespace.parent_id">
          <span class="text-gray-600 dark:text-gray-400">Parent:</span>
          <code class="ml-2 font-mono text-gray-900 dark:text-white">{{ getParentPath() }}</code>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="error" class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md p-3">
        <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      </div>

      <!-- Warning for edit mode -->
      <div v-if="isEditMode" class="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
        <p class="text-sm text-yellow-700 dark:text-yellow-300">
          Note: Namespace names cannot be changed after creation. This ensures path consistency.
        </p>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <SecondaryButton @click="$emit('close')" variant="cancel">
          Cancel
        </SecondaryButton>
        
        <PrimaryButton
          @click="handleSubmit"
          :disabled="saving"
        >
          {{ isEditMode ? 'Update Namespace' : 'Create Namespace' }}
        </PrimaryButton>
      </div>
    </template>
  </ModalInterface>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { api } from '../utils/api';
import { currentNamespaceId } from '../stores/namespace';
import ModalInterface from './ModalInterface.vue';
import BaseInput from './BaseInput.vue';
import PrimaryButton from './PrimaryButton.vue';
import SecondaryButton from './SecondaryButton.vue';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  namespace: {
    type: Object,
    default: null
  },
  selectedParent: {
    type: Object,
    default: null
  },
  namespaces: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'saved']);

// State
const form = ref({
  name: '',
  domain: '',
  parent_id: ''
});
const errors = ref({});
const error = ref(null);
const saving = ref(false);

// Computed
const isEditMode = computed(() => !!props.namespace);

const modalTitle = computed(() => {
  if (isEditMode.value) {
    return props.namespace?.parent_id ? 'Edit Sub-Namespace' : 'Edit Namespace';
  } else if (props.selectedParent) {
    return 'Create Sub-Namespace';
  } else {
    return 'Create Namespace';
  }
});

const currentNamespace = computed(() => {
  if (!currentNamespaceId.value) return null;
  return props.namespaces.find(ns => ns.id === currentNamespaceId.value);
});

const availableParents = computed(() => {
  let filteredNamespaces = props.namespaces;
  
  if (isEditMode.value) {
    // In edit mode, exclude self and descendants
    filteredNamespaces = filteredNamespaces.filter(ns => {
      return ns.id !== props.namespace.id && 
             !ns.full_path.startsWith(props.namespace.full_path + '/');
    });
  }
  
  // Only show namespaces that are at the current level or below
  if (currentNamespace.value) {
    filteredNamespaces = filteredNamespaces.filter(ns => {
      // Include current namespace itself and its descendants
      return ns.id === currentNamespace.value.id || 
             ns.full_path.startsWith(currentNamespace.value.full_path + '/') ||
             ns.full_path === currentNamespace.value.full_path;
    });
  }
  
  return filteredNamespaces;
});

const pathPreview = computed(() => {
  if (!form.value.name) return '';
  
  if (!form.value.parent_id) {
    return form.value.name;
  }
  
  const parent = props.namespaces.find(ns => ns.id === form.value.parent_id);
  return parent ? `${parent.full_path}/${form.value.name}` : form.value.name;
});

// Methods
const getParentPath = () => {
  if (!props.namespace?.parent_id) return null;
  const parent = props.namespaces.find(ns => ns.id === props.namespace.parent_id);
  return parent?.full_path || 'Unknown';
};

const validateForm = () => {
  errors.value = {};
  
  if (!form.value.name.trim()) {
    errors.value.name = 'Name is required';
    return false;
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(form.value.name)) {
    errors.value.name = 'Only letters, numbers, hyphens and underscores allowed';
    return false;
  }
  
  if (form.value.name.length < 2 || form.value.name.length > 50) {
    errors.value.name = 'Name must be between 2 and 50 characters';
    return false;
  }
  
  // Domain validation (optional field)
  if (form.value.domain && form.value.domain.trim()) {
    const domain = form.value.domain.trim();
    
    // Split domain and port
    const parts = domain.split(':');
    const domainPart = parts[0];
    const portPart = parts[1];
    
    // Check if it's a valid domain/subdomain
    // Must have at least one dot for a valid domain (except localhost)
    const isLocalhost = domainPart.toLowerCase() === 'localhost';
    const hasDot = domainPart.includes('.');
    
    if (!isLocalhost && !hasDot) {
      errors.value.domain = 'Please enter a valid domain (e.g., example.com) or subdomain (e.g., sub.example.com)';
      return false;
    } else if (!isLocalhost) {
      // Validate domain format
      const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      if (!domainRegex.test(domainPart)) {
        errors.value.domain = 'Invalid domain format. Domain must contain valid characters and a proper TLD (e.g., .com, .org)';
        return false;
      }
    }
    
    // Validate port if present
    if (portPart !== undefined) {
      if (!/^\d+$/.test(portPart)) {
        errors.value.domain = 'Port must be a number';
        return false;
      } else {
        const port = parseInt(portPart);
        if (port < 1 || port > 65535) {
          errors.value.domain = 'Port must be between 1 and 65535';
          return false;
        }
      }
    }
    
    // Additional validation for invalid patterns
    if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
      errors.value.domain = 'Domain cannot start or end with a dot';
      return false;
    }
    if (domainPart.includes('..')) {
      errors.value.domain = 'Domain cannot contain consecutive dots';
      return false;
    }
  }
  
  return true;
};

const handleSubmit = async () => {
  if (!validateForm()) return;
  
  saving.value = true;
  error.value = null;
  
  try {
    if (isEditMode.value) {
      // Update existing namespace - only send domain, not name
      await api.patch(`/namespaces/${props.namespace.id}`, {
        domain: form.value.domain?.trim() || null
      });
    } else {
      // Create new namespace
      const data = {
        name: form.value.name,
        domain: form.value.domain?.trim() || null,
        parent_id: form.value.parent_id
      };
      await api.post('/namespaces', data);
    }
    
    emit('saved');
  } catch (err) {
    error.value = err.message || 'Failed to save namespace';
  } finally {
    saving.value = false;
  }
};

// Initialize form when modal opens
watch(() => props.show, (newVal) => {
  if (newVal) {
    // Reset errors
    errors.value = {};
    error.value = null;
    
    if (props.namespace) {
      form.value.name = props.namespace.name;
      form.value.domain = props.namespace.domain || '';
      form.value.parent_id = props.namespace.parent_id || '';
    } else {
      // Reset form for new namespace
      form.value.name = '';
      form.value.domain = '';
      
      // Use selectedParent if provided, otherwise use current namespace
      if (props.selectedParent) {
        form.value.parent_id = props.selectedParent.id;
      } else if (currentNamespace.value) {
        form.value.parent_id = currentNamespace.value.id;
      } else {
        // Fallback to first available namespace
        const firstAvailable = availableParents.value[0];
        if (firstAvailable) {
          form.value.parent_id = firstAvailable.id;
        }
      }
    }
  }
}, { immediate: true });

</script>