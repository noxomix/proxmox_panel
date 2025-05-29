<template>
  <code
    :class="[
      'inline-flex items-center px-2 py-1 rounded font-mono text-sm',
      sizeClasses,
      variantClasses
    ]"
  >
    <slot />
  </code>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary', 'success', 'warning', 'error'].includes(value)
  },
  size: {
    type: String,
    default: 'sm',
    validator: (value) => ['xs', 'sm', 'md', 'lg'].includes(value)
  }
});

const sizeClasses = computed(() => {
  const sizes = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-1.5 text-base',
    lg: 'px-4 py-2 text-lg'
  };
  return sizes[props.size];
});

const variantClasses = computed(() => {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    primary: 'bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300',
    success: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
    error: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
  };
  return variants[props.variant];
});
</script>