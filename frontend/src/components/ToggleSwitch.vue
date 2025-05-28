<template>
  <label class="relative inline-flex items-center cursor-pointer">
    <input 
      type="checkbox" 
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
      class="sr-only peer"
    >
    <div 
      :class="[
        'relative bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all dark:border-gray-600 peer-checked:bg-brand-600 dark:peer-checked:bg-brand-600',
        sizeClasses.container,
        sizeClasses.toggle,
        sizeClasses.translate
      ]"
    ></div>
  </label>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  }
});

defineEmits(['update:modelValue']);

const sizeClasses = computed(() => {
  const sizes = {
    sm: {
      container: 'w-8 h-5',
      toggle: 'after:h-4 after:w-4',
      translate: 'peer-checked:after:translate-x-3 rtl:peer-checked:after:-translate-x-3'
    },
    md: {
      container: 'w-10 h-6',
      toggle: 'after:h-5 after:w-5',
      translate: 'peer-checked:after:translate-x-4 rtl:peer-checked:after:-translate-x-4'
    },
    lg: {
      container: 'w-12 h-7',
      toggle: 'after:h-6 after:w-6',
      translate: 'peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5'
    }
  };
  
  return sizes[props.size];
});
</script>