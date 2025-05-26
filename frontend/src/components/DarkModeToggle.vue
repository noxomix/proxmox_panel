<template>
  <button
    @click="toggleDarkMode"
    class="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    title="Toggle dark mode"
  >
    <SunIcon v-if="isDark" className="w-5 h-5 text-yellow-500" />
    <MoonIcon v-else className="w-5 h-5 text-slate-400" />
  </button>
</template>

<script>
import { isDark, toggleDarkMode } from '../utils/darkMode.js'
import SunIcon from './icons/SunIcon.vue'
import MoonIcon from './icons/MoonIcon.vue'

export default {
  name: 'DarkModeToggle',
  components: {
    SunIcon,
    MoonIcon
  },
  setup() {
    return {
      isDark,
      toggleDarkMode
    }
  }
}
</script>