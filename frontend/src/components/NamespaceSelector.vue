<template>
  <div class="px-3 pb-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
    <div class="pt-4">
      <div class="relative">
        <button
          @click="toggleDropdown"
          :class="[
            'w-full flex items-center justify-between px-3 py-2 text-left text-sm',
            'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600',
            'border border-gray-200 dark:border-gray-600 rounded-lg transition-colors'
          ]"
        >
          <div class="flex items-center min-w-0">
            <FolderIcon 
              className="w-4 h-4 text-brand-600 dark:text-brand-400 mr-2 flex-shrink-0" 
              style="fill: currentColor"
            />
            <span 
              v-if="!sidebarCollapsed" 
              class="text-gray-700 dark:text-gray-300 truncate"
              :title="currentNamespacePath || '/'"
              v-html="formatPathWithBoldName(currentNamespacePath || '/')"
            >
            </span>
          </div>
          <ChevronDownIcon 
            v-if="!sidebarCollapsed"
            className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" 
          />
        </button>

        <!-- Dropdown -->
        <div
          v-if="showDropdown && !sidebarCollapsed"
          class="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          <div class="p-2">
            <div
              v-for="namespace in sortedNamespaces"
              :key="namespace.id"
              @click="selectNamespace(namespace)"
              class="flex items-center px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              :class="{
                'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300': currentNamespaceId === namespace.id
              }"
            >
              <FolderIcon 
                :className="`w-4 h-4 mr-2 flex-shrink-0 ${currentNamespaceId === namespace.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`"
                :style="currentNamespaceId === namespace.id ? 'fill: currentColor' : ''"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 truncate" :title="namespace.full_path" v-html="formatPathWithBoldName(namespace.full_path)">
              </span>
            </div>
            
            <div v-if="sortedNamespaces.length === 0" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No namespaces available
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { currentNamespaceId, currentNamespacePath, availableNamespaces, setCurrentNamespace, setAvailableNamespaces } from '../stores/namespace';
import { api } from '../utils/api';
import FolderIcon from './icons/FolderIcon.vue';
import ChevronDownIcon from './icons/ChevronDownIcon.vue';

const props = defineProps({
  sidebarCollapsed: {
    type: Boolean,
    default: false
  }
});

const showDropdown = ref(false);

const sortedNamespaces = computed(() => {
  return availableNamespaces.value.slice().sort((a, b) => {
    return a.full_path.localeCompare(b.full_path);
  });
});

const toggleDropdown = () => {
  if (props.sidebarCollapsed) return;
  showDropdown.value = !showDropdown.value;
};

const selectNamespace = (namespace) => {
  setCurrentNamespace(namespace.id, namespace.full_path);
  showDropdown.value = false;
};

const formatPathWithBoldName = (fullPath) => {
  if (!fullPath) return '';
  
  const segments = fullPath.split('/');
  const lastName = segments.pop(); // Get the last segment (name)
  const parentPath = segments.join('/'); // Get everything before the last segment
  
  if (parentPath) {
    return `${parentPath}/<strong>${lastName}</strong>`;
  } else {
    return `<strong>${lastName}</strong>`;
  }
};

const fetchNamespaces = async () => {
  try {
    const response = await api.get('/namespaces/list');
    if (response.success && response.data.namespaces) {
      // Convert the id => path mapping to namespace objects
      const namespaceObjects = [];
      for (const [id, path] of Object.entries(response.data.namespaces)) {
        namespaceObjects.push({
          id,
          full_path: path,
          name: path.split('/').pop()
        });
      }
      setAvailableNamespaces(namespaceObjects);
    }
  } catch (error) {
    console.error('Failed to fetch namespaces:', error);
  }
};

const handleClickOutside = (event) => {
  if (!event.target.closest('.relative')) {
    showDropdown.value = false;
  }
};

onMounted(() => {
  fetchNamespaces();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>