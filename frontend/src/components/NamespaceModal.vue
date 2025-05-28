<template>
  <ModalInterface
    :show="show"
    :title="isEditMode ? 'View Namespace' : 'Create Namespace'"
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
        <button
          type="button"
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
        >
          Cancel
        </button>
        
        <button
          v-if="!isEditMode"
          type="button"
          @click="handleSubmit"
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Namespace
        </button>
      </div>
    </template>
  </ModalInterface>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { api } from '../utils/api';
import ModalInterface from './ModalInterface.vue';
import BaseInput from './BaseInput.vue';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  namespace: {
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
  parent_id: ''
});
const errors = ref({});
const error = ref(null);
const saving = ref(false);

// Computed
const isEditMode = computed(() => !!props.namespace);

const rootNamespace = computed(() => {
  return props.namespaces.find(ns => !ns.parent_id);
});

const availableParents = computed(() => {
  if (isEditMode.value) {
    // In edit mode, exclude self and descendants
    return props.namespaces.filter(ns => {
      return ns.id !== props.namespace.id && 
             !ns.full_path.startsWith(props.namespace.full_path + '/');
    });
  }
  return props.namespaces;
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
  
  return true;
};

const handleSubmit = async () => {
  if (!validateForm()) return;
  
  saving.value = true;
  error.value = null;
  
  try {
    if (isEditMode.value) {
      // Update existing namespace
      await api.patch(`/namespaces/${props.namespace.id}`, {
        name: form.value.name
      });
    } else {
      // Create new namespace
      const data = {
        name: form.value.name,
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
      form.value.parent_id = props.namespace.parent_id || '';
    } else {
      // Reset form for new namespace
      form.value.name = '';
      // Set root namespace as default parent
      if (rootNamespace.value) {
        form.value.parent_id = rootNamespace.value.id;
      }
    }
  }
}, { immediate: true });

</script>