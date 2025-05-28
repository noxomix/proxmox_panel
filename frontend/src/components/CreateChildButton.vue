<template>
  <RippleEffect color="rgba(59, 130, 246, 0.3)">
    <template #default="{ createRipple }">
      <button
        @click="$emit('click')"
        @mousedown="createRipple"
        class="relative p-1.5 rounded-lg transition-colors duration-150 overflow-hidden shadow-sm hover:shadow-md border flex items-center justify-center bg-brand-600 text-white border-brand-600 hover:bg-brand-700 hover:border-brand-700"
        title="Create child namespace"
      >
        <CreateChildIcon class="w-5 h-5" />
      </button>
    </template>
  </RippleEffect>
</template>

<script setup>
import RippleEffect from './RippleEffect.vue';
import CreateChildIcon from './icons/CreateChildIcon.vue';

defineEmits(['click']);
</script>