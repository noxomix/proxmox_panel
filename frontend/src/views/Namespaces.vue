<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <!-- View Toggle -->
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            v-model="showAsTree"
            class="rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
          />
          <span class="text-gray-700 dark:text-gray-300">Tree view</span>
        </label>
      </div>
      <CreateButton @click="openCreateModal">
        Create Namespace
      </CreateButton>
    </div>

    <!-- Tree View -->
    <div v-if="showAsTree && !loading && !error">
      <div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="p-4">
          <div v-if="namespaceTree.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            No namespaces found
          </div>
          <div v-else class="space-y-1">
            <NamespaceTreeNode
              v-for="node in namespaceTree"
              :key="node.id"
              :node="node"
              :depth="0"
              @edit="editNamespace"
              @delete="confirmDelete"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <BaseTable
      v-else
      :data="namespaces"
      :loading="loading"
      :error="error"
      loading-text="Loading namespaces..."
      error-title="Failed to load namespaces"
      @retry="fetchNamespaces"
    >
      <template #header>
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Name
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Full Path
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Depth
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Created
          </th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </template>

      <template #body>
        <tr v-for="namespace in namespaces" :key="namespace.id"
            class="odd:bg-gray-50 odd:dark:bg-gray-700 even:bg-white even:dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              {{ namespace.name }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <code class="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
              {{ namespace.full_path }}
            </code>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              {{ namespace.depth }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              {{ formatDate(namespace.created_at) }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right">
            <div class="flex items-center justify-end gap-2">
              <ActionButton 
                v-if="!isRootNamespace(namespace)"
                variant="edit"
                title="Edit namespace"
                icon="EditIcon"
                @click="editNamespace(namespace)"
              />
              <ActionButton 
                v-if="!isRootNamespace(namespace)"
                variant="delete"
                title="Delete namespace"
                icon="DeleteIcon"
                @click="confirmDelete(namespace)"
              />
            </div>
          </td>
        </tr>
      </template>
    </BaseTable>

    <!-- Create/Edit Modal -->
    <NamespaceModal
      :show="showModal"
      :namespace="selectedNamespace"
      :namespaces="allNamespaces"
      @close="closeModal"
      @saved="handleSaved"
    />

    <!-- Delete Confirmation Modal -->
    <ModalInterface
      :show="showDeleteModal"
      title="Delete Namespace"
      @close="showDeleteModal = false"
    >
      <div class="space-y-4">
        <p class="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete the namespace 
          <strong class="text-gray-900 dark:text-white">{{ namespaceToDelete?.name }}</strong>?
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Full path: <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{{ namespaceToDelete?.full_path }}</code>
        </p>
        <p class="text-sm text-red-600 dark:text-red-400">
          This action cannot be undone.
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="showDeleteModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            @click="deleteNamespace"
            :disabled="deleting"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Delete Namespace
          </button>
        </div>
      </template>
    </ModalInterface>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { api } from '../utils/api';
import BaseTable from '../components/BaseTable.vue';
import CreateButton from '../components/CreateButton.vue';
import ActionButton from '../components/ActionButton.vue';
import ModalInterface from '../components/ModalInterface.vue';
import NamespaceModal from '../components/NamespaceModal.vue';
import NamespaceTreeNode from '../components/NamespaceTreeNode.vue';

// State
const namespaces = ref([]);
const namespaceTree = ref([]);
const allNamespaces = ref([]); // Always keep a flat list for the modal
const loading = ref(true);
const error = ref(null);
const showModal = ref(false);
const showDeleteModal = ref(false);
const selectedNamespace = ref(null);
const namespaceToDelete = ref(null);
const deleting = ref(false);
const showAsTree = ref(false);

// Methods
const fetchNamespaces = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Always fetch flat list
    const flatResponse = await api.get('/namespaces');
    allNamespaces.value = flatResponse.data.namespaces || [];
    namespaces.value = allNamespaces.value;
    
    // If tree view is enabled, also fetch tree structure
    if (showAsTree.value) {
      const treeResponse = await api.get('/namespaces?tree=true');
      namespaceTree.value = treeResponse.data.namespaces || [];
    }
  } catch (err) {
    error.value = err.message || 'Failed to fetch namespaces';
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  selectedNamespace.value = null;
  showModal.value = true;
};

const editNamespace = (namespace) => {
  selectedNamespace.value = namespace;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedNamespace.value = null;
};

const handleSaved = async () => {
  closeModal();
  await fetchNamespaces();
};

const confirmDelete = (namespace) => {
  namespaceToDelete.value = namespace;
  showDeleteModal.value = true;
};

const deleteNamespace = async () => {
  if (!namespaceToDelete.value) return;
  
  deleting.value = true;
  try {
    await api.delete(`/namespaces/${namespaceToDelete.value.id}`);
    showDeleteModal.value = false;
    fetchNamespaces();
  } catch (err) {
    alert(err.message || 'Failed to delete namespace');
  } finally {
    deleting.value = false;
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

const isRootNamespace = (namespace) => {
  return !namespace.parent_id;
};

// Lifecycle
onMounted(() => {
  fetchNamespaces().catch(err => {
    console.error('Error in onMounted:', err);
  });
});

// Watch for view toggle changes
watch(showAsTree, () => {
  fetchNamespaces();
});
</script>