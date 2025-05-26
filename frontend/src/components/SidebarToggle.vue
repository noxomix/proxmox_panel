<template>
  <button
    @click="$emit('toggle')"
    class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
  >
    <ChevronDownIcon 
      :className="['w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-300', isCollapsed ? '-rotate-90' : 'rotate-90']"
    />
  </button>
</template>

<script>
import ChevronDownIcon from './icons/ChevronDownIcon.vue'

export default {
  name: 'SidebarToggle',
  components: {
    ChevronDownIcon
  },
  props: {
    isCollapsed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle']
}
</script>