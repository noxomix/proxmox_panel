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
    default: 'primary',
    validator: (value) => ['primary', 'danger', 'warning', 'success'].includes(value)
  }
});

const emit = defineEmits(['click']);

const handleClick = (e) => {
  emit('click', e);
};

const buttonClasses = computed(() => {
  const base = 'relative overflow-hidden px-4 py-2 text-sm font-medium border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors flex items-center justify-center whitespace-nowrap';
  
  const variants = {
    primary: 'text-white bg-brand-600 hover:bg-brand-700 focus:ring-brand-500',
    danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'text-white bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    success: 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
  };
  
  const disabled = 'disabled:opacity-50 disabled:cursor-not-allowed';
  
  return `${base} ${variants[props.variant]} ${props.disabled ? disabled : ''}`;
});

const rippleColor = computed(() => {
  const colors = {
    primary: 'rgba(255, 255, 255, 0.3)',
    danger: 'rgba(255, 255, 255, 0.3)',
    warning: 'rgba(255, 255, 255, 0.3)',
    success: 'rgba(255, 255, 255, 0.3)'
  };
  return colors[props.variant];
});
</script>