<template>
  <RippleEffect color="rgba(239, 68, 68, 0.3)">
    <template #default="{ createRipple }">
      <button
        @click="$emit('click')"
        @mousedown="createRipple"
        class="relative p-1.5 rounded-lg transition-colors duration-150 overflow-hidden shadow-sm hover:shadow-md border flex items-center justify-center bg-red-100 text-red-600 border-red-300 hover:bg-red-200 hover:border-red-400 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
        :title="title"
      >
        <DeleteSimpleIcon class="w-4 h-4" />
      </button>
    </template>
  </RippleEffect>
</template>

<script setup>
import RippleEffect from './RippleEffect.vue';
import DeleteSimpleIcon from './icons/DeleteSimpleIcon.vue';

defineProps({
  title: {
    type: String,
    default: 'Delete'
  }
});

defineEmits(['click']);
</script>