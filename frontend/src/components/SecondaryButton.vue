<template>
  <RippleEffect :color="rippleColor" v-slot="{ createRipple }">
    <button
      :type="type"
      @click="handleClick"
      @mousedown="createRipple"
      @touchstart="createRipple"
      :disabled="disabled"
      :class="buttonClasses"
    >
      <slot />
    </button>
  </RippleEffect>
</template>

<script setup>
import { computed } from 'vue';
import RippleEffect from './RippleEffect.vue';

const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'cancel'].includes(value)
  }
});

const emit = defineEmits(['click']);

const handleClick = (e) => {
  emit('click', e);
};

const buttonClasses = computed(() => {
  const base = 'relative overflow-hidden px-4 py-2 text-sm font-medium border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  const variants = {
    default: 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-500',
    cancel: 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-500'
  };
  
  const disabled = 'disabled:opacity-50 disabled:cursor-not-allowed';
  
  return `${base} ${variants[props.variant]} ${props.disabled ? disabled : ''}`;
});

const rippleColor = computed(() => {
  return props.variant === 'cancel' ? 'rgba(251, 113, 133, 0.2)' : 'rgba(107, 114, 128, 0.3)';
});
</script>