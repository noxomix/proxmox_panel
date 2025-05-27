<template>
  <RippleEffect :color="rippleColor">
    <template #default="{ createRipple }">
      <button
        @click="$emit('click')"
        @mousedown="createRipple"
        :disabled="disabled"
        :class="[
          'relative px-4 py-2.5 rounded-lg transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md border flex items-center justify-center font-medium text-sm',
          buttonClasses,
          { 'opacity-50 cursor-not-allowed': disabled }
        ]"
        :title="title"
      >
        <component v-if="icon" :is="icon" :className="'w-5 h-5 mr-2'" />
        <span>{{ text }}</span>
      </button>
    </template>
  </RippleEffect>
</template>

<script>
import RippleEffect from './RippleEffect.vue';
import LogoutIcon from './icons/LogoutIcon.vue';

export default {
  name: 'PrimaryButton',
  components: {
    RippleEffect,
    LogoutIcon
  },
  props: {
    variant: {
      type: String,
      required: true,
      validator: (value) => ['danger', 'warning', 'primary', 'secondary'].includes(value)
    },
    text: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: null
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click'],
  computed: {
    buttonClasses() {
      const variants = {
        danger: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 hover:border-red-400 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30',
        warning: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 hover:border-orange-400 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/30',
        primary: 'bg-brand-100 text-brand-700 border-brand-300 hover:bg-brand-200 hover:border-brand-400 dark:bg-brand-900/20 dark:text-brand-400 dark:border-brand-800 dark:hover:bg-brand-900/30',
        secondary: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:border-gray-400 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800 dark:hover:bg-gray-900/30'
      };
      return variants[this.variant] || variants.secondary;
    },
    rippleColor() {
      const colors = {
        danger: 'rgba(239, 68, 68, 0.3)',    // red-500 with opacity
        warning: 'rgba(249, 115, 22, 0.3)',  // orange-500 with opacity
        primary: 'rgba(59, 130, 246, 0.3)',  // brand-500 with opacity
        secondary: 'rgba(107, 114, 128, 0.3)' // gray-500 with opacity
      };
      return colors[this.variant] || colors.secondary;
    }
  }
}
</script>