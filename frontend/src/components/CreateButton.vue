<template>
  <RippleEffect :color="'rgba(255, 255, 255, 0.3)'">
    <template #default="{ createRipple }">
      <button
        @click="$emit('click')"
        @mousedown="createRipple"
        class="relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-lg shadow-sm hover:bg-brand-700 focus:outline-none transition-colors duration-200 whitespace-nowrap overflow-hidden"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <slot>Create</slot>
      </button>
    </template>
  </RippleEffect>
</template>

<script>
import RippleEffect from './RippleEffect.vue';

export default {
  name: 'CreateButton',
  components: {
    RippleEffect
  },
  emits: ['click']
};
</script>