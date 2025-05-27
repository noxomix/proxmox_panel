<template>
  <span 
    :class="badgeClasses"
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200"
  >
    <span 
      :class="dotClasses"
      class="w-1.5 h-1.5 mr-1.5 rounded-full"
    ></span>
    {{ displayText }}
  </span>
</template>

<script>
export default {
  name: 'StatusBadge',
  props: {
    status: {
      type: String,
      required: true,
      validator: (value) => ['active', 'disabled', 'blocked'].includes(value)
    }
  },
  computed: {
    statusConfig() {
      const configs = {
        active: {
          text: 'Active',
          badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
          dotClass: 'bg-green-500'
        },
        disabled: {
          text: 'Disabled',
          badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
          dotClass: 'bg-gray-500'
        },
        blocked: {
          text: 'Blocked',
          badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
          dotClass: 'bg-red-500'
        }
      };
      return configs[this.status] || configs.disabled;
    },
    displayText() {
      return this.statusConfig.text;
    },
    badgeClasses() {
      return this.statusConfig.badgeClass;
    },
    dotClasses() {
      return this.statusConfig.dotClass;
    }
  }
};
</script>