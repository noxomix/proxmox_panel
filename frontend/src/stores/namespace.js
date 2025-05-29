import { ref, computed } from 'vue';

// Global namespace state
export const currentNamespaceId = ref(null);
export const currentNamespacePath = ref('/');
export const availableNamespaces = ref([]);

// Computed properties
export const currentNamespace = computed(() => {
  if (!currentNamespaceId.value) return null;
  return availableNamespaces.value.find(ns => ns.id === currentNamespaceId.value);
});

// Actions
export const setCurrentNamespace = (namespaceId, namespacePath = '/') => {
  currentNamespaceId.value = namespaceId;
  currentNamespacePath.value = namespacePath;
  
  // Store in localStorage for persistence
  if (namespaceId) {
    localStorage.setItem('currentNamespaceId', namespaceId);
    localStorage.setItem('currentNamespacePath', namespacePath);
  } else {
    localStorage.removeItem('currentNamespaceId');
    localStorage.removeItem('currentNamespacePath');
  }
};

export const setAvailableNamespaces = (namespaces) => {
  availableNamespaces.value = namespaces;
};

// Initialize from localStorage
export const initializeNamespaceStore = () => {
  const storedNamespaceId = localStorage.getItem('currentNamespaceId');
  const storedNamespacePath = localStorage.getItem('currentNamespacePath');
  
  if (storedNamespaceId) {
    currentNamespaceId.value = storedNamespaceId;
    currentNamespacePath.value = storedNamespacePath || '/';
  }
};

// Auto-initialize
initializeNamespaceStore();