<template>
  <RippleEffect color="rgba(59, 130, 246, 0.3)">
    <template #default="{ createRipple }">
      <button
        @click="$emit('click')"
        @mousedown="createRipple"
        class="relative p-1.5 rounded-lg transition-colors duration-150 overflow-hidden shadow-sm hover:shadow-md border flex items-center justify-center bg-brand-100 text-brand-600 border-brand-300 hover:bg-brand-200 hover:border-brand-400 dark:bg-brand-900/20 dark:text-brand-400 dark:border-brand-800 dark:hover:bg-brand-900/30"
        :title="title"
      >
        <EditResourceIcon />
      </button>
    </template>
  </RippleEffect>
</template>

<script setup>
import RippleEffect from './RippleEffect.vue';
import EditResourceIcon from './icons/EditResourceIcon.vue';

defineProps({
  title: {
    type: String,
    default: 'Edit'
  }
});

defineEmits(['click']);
</script>