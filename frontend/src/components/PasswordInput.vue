<template>
  <div class="space-y-1">
    <label v-if="label" :for="id" class="block text-sm font-medium text-gray-900 dark:text-white">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <input
        :id="id"
        v-model="value"
        :type="showPassword ? 'text' : 'password'"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :class="inputClasses"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />
      <button
        type="button"
        :class="toggleButtonClasses"
        @click="togglePasswordVisibility"
        :disabled="disabled"
      >
        <EyeSlashIcon v-if="showPassword" className="w-5 h-5" />
        <EyeIcon v-else className="w-5 h-5" />
      </button>
    </div>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <p v-if="help" class="text-sm text-gray-500 dark:text-gray-400">{{ help }}</p>
  </div>
</template>

<script>
import EyeIcon from './icons/EyeIcon.vue'
import EyeSlashIcon from './icons/EyeSlashIcon.vue'

export default {
  name: 'PasswordInput',
  components: {
    EyeIcon,
    EyeSlashIcon
  },
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    id: {
      type: String,
      default: () => `password-${Math.random().toString(36).substr(2, 9)}`
    },
    label: {
      type: String,
      default: ''
    },
    placeholder: {
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
    },
    autocomplete: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'focus', 'blur'],
  data() {
    return {
      showPassword: false
    }
  },
  computed: {
    value: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      }
    },
    inputClasses() {
      const baseClasses = 'block w-full pl-3 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors'
      const normalClasses = 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500'
      const errorClasses = 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 placeholder-red-400 dark:placeholder-red-500 focus:ring-red-500 focus:border-red-500'
      const disabledClasses = 'opacity-50 cursor-not-allowed'
      
      return [
        baseClasses,
        this.error ? errorClasses : normalClasses,
        this.disabled && disabledClasses
      ].filter(Boolean).join(' ')
    },
    toggleButtonClasses() {
      const baseClasses = 'absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors'
      const disabledClasses = 'opacity-50 cursor-not-allowed'
      
      return [
        baseClasses,
        this.disabled && disabledClasses
      ].filter(Boolean).join(' ')
    }
  },
  methods: {
    togglePasswordVisibility() {
      if (!this.disabled) {
        this.showPassword = !this.showPassword
      }
    }
  }
}
</script>