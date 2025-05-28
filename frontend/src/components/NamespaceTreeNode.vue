<template>
  <div>
    <div class="group flex items-center gap-2 py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div class="flex items-center" :style="{ marginLeft: (depth * 20) + 'px' }">
        <span v-if="depth > 0" class="text-gray-400 dark:text-gray-500 mr-2">├─</span>
        <FolderIcon class="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
      </div>
      <div class="flex-1 min-w-0">
        <span class="font-medium text-gray-900 dark:text-white">{{ node.name }}</span>
        <code class="text-xs text-gray-500 dark:text-gray-400 ml-2">{{ node.full_path }}</code>
      </div>
      <div class="flex items-center gap-1">
        <ActionButton 
          v-if="!isRootNamespace"
          variant="edit"
          title="Edit namespace"
          icon="EditIcon"
          @click="$emit('edit', node)"
        />
        <ActionButton 
          v-if="!isRootNamespace"
          variant="delete"
          title="Delete namespace"
          icon="DeleteIcon"
          @click="$emit('delete', node)"
        />
      </div>
    </div>
    <div v-if="node.children && node.children.length > 0">
      <NamespaceTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import ActionButton from './ActionButton.vue';
import FolderIcon from './icons/FolderIcon.vue';

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  }
});

defineEmits(['edit', 'delete']);

const isRootNamespace = computed(() => {
  return !props.node.parent_id;
});
</script>