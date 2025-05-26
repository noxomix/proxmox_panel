<template>
  <li>
    <router-link
      v-if="to"
      :to="to"
      class="flex items-center px-3 py-2 rounded-l-lg rounded-r-lg text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200"
      active-class="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm rounded-l-lg rounded-r-sm"
      :class="sidebarCollapsed ? 'justify-center px-2' : ''"
    >
      <component 
        :is="icon" 
        :className="sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'" 
      />
      <span v-if="!sidebarCollapsed" class="ml-3 font-medium">
        <slot />
      </span>
    </router-link>
    
    <button
      v-else
      class="w-full flex items-center px-3 py-2 rounded-l-lg rounded-r-lg text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200"
      :class="sidebarCollapsed ? 'justify-center px-2' : ''"
      @click="$emit('click')"
    >
      <component 
        :is="icon" 
        :className="sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'" 
      />
      <span v-if="!sidebarCollapsed" class="ml-3 font-medium">
        <slot />
      </span>
    </button>
  </li>
</template>

<script>
export default {
  name: 'SidebarLink',
  props: {
    to: {
      type: String,
      default: null
    },
    icon: {
      type: Object,
      required: true
    },
    sidebarCollapsed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click']
}
</script>