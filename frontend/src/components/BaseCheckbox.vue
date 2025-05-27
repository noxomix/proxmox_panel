<template>
  <div class="space-y-1">
    <div class="flex items-center">
      <input
        :id="id"
        v-model="value"
        type="checkbox"
        :required="required"
        :disabled="disabled"
        :class="checkboxClasses"
        @change="$emit('update:modelValue', $event.target.checked)"
      />
      <label v-if="label" :for="id" class="ml-2 block text-sm text-gray-900 dark:text-white">
        {{ label }}
        <span v-if="required" class="text-red-500">*</span>
      </label>
    </div>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <p v-if="help" class="text-sm text-gray-500 dark:text-gray-400">{{ help }}</p>
  </div>
</template>

<script>
export default {
  name: 'BaseCheckbox',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    id: {
      type: String,
      default: () => `checkbox-${Math.random().toString(36).substr(2, 9)}`
    },
    label: {
      type: String,
      default: ''
    },
    required: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    help: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue'],
  computed: {
    value: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      }
    },
    checkboxClasses() {
      const baseClasses = 'h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:focus:ring-blue-600 transition-colors'
      const errorClasses = 'border-red-300 dark:border-red-600 text-red-600 focus:ring-red-500'
      const disabledClasses = 'opacity-50 cursor-not-allowed'
      
      return [
        baseClasses,
        this.error && errorClasses,
        this.disabled && disabledClasses
      ].filter(Boolean).join(' ')
    }
  }
}
</script>