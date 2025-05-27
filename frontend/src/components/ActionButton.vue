<template>
  <RippleEffect :color="rippleColor">
    <template #default="{ createRipple }">
      <button
        @click="$emit('click')"
        @mousedown="createRipple"
        :class="[
          'relative p-1.5 rounded-lg transition-colors duration-150 overflow-hidden shadow-sm hover:shadow-md border flex items-center justify-center',
          buttonClasses
        ]"
        :title="title"
      >
        <component :is="icon" :className="'w-5 h-5'" />
      </button>
    </template>
  </RippleEffect>
</template>

<script>
import RippleEffect from './RippleEffect.vue';
import EditIcon from './icons/EditIcon.vue';
import DeleteIcon from './icons/DeleteIcon.vue';
import ImpersonateIcon from './icons/ImpersonateIcon.vue';

export default {
  name: 'ActionButton',
  components: {
    RippleEffect,
    EditIcon,
    DeleteIcon,
    ImpersonateIcon
  },
  props: {
    variant: {
      type: String,
      required: true,
      validator: (value) => ['edit', 'delete', 'impersonate'].includes(value)
    },
    title: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    }
  },
  emits: ['click'],
  computed: {
    buttonClasses() {
      const variants = {
        edit: 'bg-blue-100 text-blue-600 border-blue-300 hover:bg-blue-200 hover:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30',
        delete: 'bg-red-100 text-red-600 border-red-300 hover:bg-red-200 hover:border-red-400 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30',
        impersonate: 'bg-green-100 text-green-600 border-green-300 hover:bg-green-200 hover:border-green-400 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30'
      };
      return variants[this.variant] || variants.edit;
    },
    rippleColor() {
      const colors = {
        edit: 'rgba(59, 130, 246, 0.3)',     // blue-500 with opacity
        delete: 'rgba(239, 68, 68, 0.3)',   // red-500 with opacity  
        impersonate: 'rgba(34, 197, 94, 0.3)' // green-500 with opacity
      };
      return colors[this.variant] || colors.edit;
    }
  }
}
</script>