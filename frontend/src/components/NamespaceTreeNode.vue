<template>
  <div>
    <div class="group flex items-center gap-2 py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div class="flex items-center" :style="{ marginLeft: (depth * 20) + 'px' }">
        <span v-if="depth > 0" class="text-gray-400 dark:text-gray-500 mr-2">├─</span>
        <FolderIcon class="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-900 dark:text-white">{{ node.name }}</span>
          <span v-if="node.domain" class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
            {{ node.domain }}
          </span>
        </div>
        <code class="text-xs text-gray-500 dark:text-gray-400">{{ node.full_path }}</code>
      </div>
      <div class="flex items-center gap-1">
        <CreateChildButton @click="$emit('create-child', node)" />
        <EditResourceButton 
          v-if="!isRootNamespace"
          title="Edit namespace"
          @click="$emit('edit', node)"
        />
        <DeleteResourceButton 
          v-if="!isRootNamespace"
          title="Delete namespace"
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
        @create-child="$emit('create-child', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import ActionButton from './ActionButton.vue';
import CreateChildButton from './CreateChildButton.vue';
import EditResourceButton from './EditResourceButton.vue';
import DeleteResourceButton from './DeleteResourceButton.vue';
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

defineEmits(['edit', 'delete', 'create-child']);

const isRootNamespace = computed(() => {
  return !props.node.parent_id;
});
</script>